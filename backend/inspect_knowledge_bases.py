#!/usr/bin/env python3
"""
Knowledge Base Inspector Script

This script allows you to inspect:
1. All knowledge bases in the database
2. ChromaDB collections and their contents
3. Individual content items and their metadata
4. Vector embeddings and search capabilities

Usage:
    python inspect_knowledge_bases.py [--kb-id <id>] [--collection <name>] [--search <query>]
"""

import os
import sys
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app.database.connection import get_db
    from app.database.models import KnowledgeBase
    from app.services.knowledge_base_service import KnowledgeBaseService
    from app.services.chroma_service import ChromaService
    from sqlalchemy.orm import Session
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you're running this script from the project root directory")
    sys.exit(1)

class KnowledgeBaseInspector:
    def __init__(self):
        self.db: Session = next(get_db())
        # Use the same ChromaDB path as the FastAPI app
        self.chroma_service = ChromaService(persist_directory="./chroma_db")
        self.kb_service = KnowledgeBaseService(self.db)
        
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    def list_all_knowledge_bases(self) -> List[KnowledgeBase]:
        """List all knowledge bases"""
        try:
            kbs = self.db.query(KnowledgeBase).filter(KnowledgeBase.is_active == True).all()
            return kbs
        except Exception as e:
            print(f"Error fetching knowledge bases: {e}")
            return []
    
    def get_knowledge_base(self, kb_id: int) -> Optional[KnowledgeBase]:
        """Get a specific knowledge base by ID"""
        try:
            kb = self.db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
            return kb
        except Exception as e:
            print(f"Error fetching knowledge base {kb_id}: {e}")
            return None
    
    def get_kb_contents(self, kb_id: int) -> List[Dict[str, Any]]:
        """Get all contents for a knowledge base from ChromaDB"""
        try:
            result = self.kb_service.get_knowledge_base_contents_from_chroma(kb_id)
            return result.get('contents', [])
        except Exception as e:
            print(f"Error fetching contents for KB {kb_id}: {e}")
            return []
    
    def get_kb_contents_direct_chroma(self, kb_id: int) -> List[Dict[str, Any]]:
        """Get contents directly from ChromaDB for debugging"""
        try:
            kb = self.get_knowledge_base(kb_id)
            if not kb or not kb.chroma_collection_name:
                return []
            
            # Get documents directly from ChromaDB
            results = self.chroma_service.get_all_documents(kb.chroma_collection_name)
            if results and results.get('documents'):
                return results['documents']
            return []
        except Exception as e:
            print(f"Error fetching contents directly from ChromaDB for KB {kb_id}: {e}")
            return []
    
    def inspect_chroma_collection(self, collection_name: str) -> Dict[str, Any]:
        """Inspect a ChromaDB collection"""
        try:
            collection = self.chroma_service.get_collection(collection_name)
            if not collection:
                return {"error": f"Collection '{collection_name}' not found"}
            
            # Get collection info
            collection_info = {
                "name": collection_name,
                "count": collection.count(),
                "metadata": collection.metadata
            }
            
            # Get all documents
            try:
                results = collection.get()
                if results and 'documents' in results:
                    collection_info["documents"] = []
                    for i in range(len(results['documents'])):
                        doc_info = {
                            "id": results['ids'][i] if 'ids' in results else f"doc_{i}",
                            "document": results['documents'][i][:200] + "..." if len(results['documents'][i]) > 200 else results['documents'][i],
                            "metadata": results['metadatas'][i] if 'metadatas' in results else {},
                            "embedding_length": len(results['embeddings'][i]) if 'embeddings' in results else 0
                        }
                        collection_info["documents"].append(doc_info)
            except Exception as e:
                collection_info["documents_error"] = str(e)
            
            return collection_info
            
        except Exception as e:
            return {"error": f"Error inspecting collection '{collection_name}': {e}"}
    
    def search_in_collection(self, collection_name: str, query: str, n_results: int = 5) -> Dict[str, Any]:
        """Search for content in a ChromaDB collection"""
        try:
            collection = self.chroma_service.get_collection(collection_name)
            if not collection:
                return {"error": f"Collection '{collection_name}' not found"}
            
            # Perform search
            results = collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            search_results = {
                "query": query,
                "collection": collection_name,
                "results": []
            }
            
            if results and 'documents' in results:
                for i in range(len(results['documents'][0])):
                    result = {
                        "id": results['ids'][0][i] if 'ids' in results else f"result_{i}",
                        "document": results['documents'][0][i][:200] + "..." if len(results['documents'][0][i]) > 200 else results['documents'][0][i],
                        "metadata": results['metadatas'][0][i] if 'metadatas' in results else {},
                        "distance": results['distances'][0][i] if 'distances' in results else None
                    }
                    search_results["results"].append(result)
            
            return search_results
            
        except Exception as e:
            return {"error": f"Error searching in collection '{collection_name}': {e}"}
    
    def print_knowledge_base_summary(self, kb: KnowledgeBase):
        """Print a summary of a knowledge base"""
        print(f"\n{'='*60}")
        print(f"Knowledge Base: {kb.name}")
        print(f"{'='*60}")
        print(f"ID: {kb.id}")
        print(f"Description: {kb.description or 'No description'}")
        print(f"User ID: {kb.user_id}")
        print(f"Chroma Collection: {kb.chroma_collection_name}")
        print(f"Created: {kb.created_at}")
        print(f"Updated: {kb.updated_at}")
        print(f"Active: {kb.is_active}")
        
        # Get content count from ChromaDB
        try:
            contents = self.get_kb_contents(kb.id)
            print(f"Content Items: {len(contents)}")
            
            if contents:
                print(f"\nContent Summary:")
                for content in contents:
                    print(f"  - {content.get('original_filename', 'Unknown')} ({content.get('content_type', 'unknown')}) - {content.get('processing_status', 'unknown')}")
                    if content.get('summary'):
                        summary_preview = content['summary'][:100] + "..." if len(content['summary']) > 100 else content['summary']
                        print(f"    Summary: {summary_preview}")
        except Exception as e:
            print(f"Error getting content count: {e}")
            print("Content Items: Unknown")
    
    def print_content_details(self, content: Dict[str, Any]):
        """Print detailed information about a content item from ChromaDB"""
        print(f"\n{'='*40}")
        print(f"Content: {content.get('original_filename', 'Unknown')}")
        print(f"{'='*40}")
        print(f"ID: {content.get('id', 'Unknown')}")
        print(f"Type: {content.get('content_type', 'unknown')}")
        print(f"Status: {content.get('processing_status', 'unknown')}")
        print(f"File Size: {(content.get('file_size', 0) / 1024):.1f} KB" if content.get('file_size') else "No file")
        print(f"MIME Type: {content.get('mime_type', 'unknown')}")
        print(f"Created: {content.get('created_at', 'Unknown')}")
        print(f"Updated: {content.get('updated_at', 'Unknown')}")
        
        if content.get('summary'):
            print(f"\nSummary:")
            print(f"{content['summary']}")
        
        if content.get('content_metadata'):
            print(f"\nMetadata:")
            print(json.dumps(content['content_metadata'], indent=2, default=str))
        
        if content.get('chroma_document_id'):
            print(f"\nChromaDB Document ID: {content['chroma_document_id']}")
        
        # Show additional ChromaDB-specific fields
        if content.get('provider_id'):
            print(f"Provider ID: {content['provider_id']}")
        if content.get('model_id'):
            print(f"Model ID: {content['model_id']}")
        if content.get('note'):
            print(f"Note: {content['note']}")
        if content.get('file_count'):
            print(f"File Count: {content['file_count']}")
    
    def print_chroma_collection_info(self, collection_info: Dict[str, Any]):
        """Print ChromaDB collection information"""
        if "error" in collection_info:
            print(f"Error: {collection_info['error']}")
            return
        
        print(f"\n{'='*50}")
        print(f"ChromaDB Collection: {collection_info['name']}")
        print(f"{'='*50}")
        print(f"Document Count: {collection_info['count']}")
        
        if collection_info.get('metadata'):
            print(f"\nCollection Metadata:")
            print(json.dumps(collection_info['metadata'], indent=2, default=str))
        
        if collection_info.get('documents'):
            print(f"\nDocuments ({len(collection_info['documents'])}):")
            for i, doc in enumerate(collection_info['documents']):
                print(f"\n  Document {i+1}:")
                print(f"    ID: {doc['id']}")
                print(f"    Content: {doc['document']}")
                print(f"    Metadata: {json.dumps(doc['metadata'], indent=4, default=str)}")
                print(f"    Embedding Length: {doc['embedding_length']}")
    
    def print_search_results(self, search_results: Dict[str, Any]):
        """Print search results"""
        if "error" in search_results:
            print(f"Error: {search_results['error']}")
            return
        
        print(f"\n{'='*50}")
        print(f"Search Results for: '{search_results['query']}'")
        print(f"Collection: {search_results['collection']}")
        print(f"{'='*50}")
        
        if not search_results['results']:
            print("No results found.")
            return
        
        for i, result in enumerate(search_results['results']):
            print(f"\nResult {i+1}:")
            print(f"  ID: {result['id']}")
            print(f"  Content: {result['document']}")
            if result['distance'] is not None:
                print(f"  Distance: {result['distance']:.4f}")
            print(f"  Metadata: {json.dumps(result['metadata'], indent=4, default=str)}")

    def recreate_missing_collection(self, kb_id: int) -> bool:
        """Recreate a missing ChromaDB collection for a knowledge base"""
        try:
            kb = self.get_knowledge_base(kb_id)
            if not kb or not kb.chroma_collection_name:
                print(f"Knowledge base {kb_id} not found or has no collection name")
                return False
            
            print(f"Attempting to recreate ChromaDB collection: {kb.chroma_collection_name}")
            
            # Create the collection with the same name
            collection = self.chroma_service.create_collection(
                collection_name=kb.chroma_collection_name,
                metadata={
                    "name": kb.name,
                    "description": kb.description,
                    "user_id": kb.user_id,
                    "created_at": kb.created_at.isoformat(),
                    "recreated_at": datetime.now().isoformat()
                }
            )
            
            if collection:
                print(f"Successfully recreated collection: {kb.chroma_collection_name}")
                return True
            else:
                print(f"Failed to recreate collection: {kb.chroma_collection_name}")
                return False
                
        except Exception as e:
            print(f"Error recreating collection for KB {kb_id}: {e}")
            return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Inspect Knowledge Bases and ChromaDB Collections')
    parser.add_argument('--kb-id', type=int, help='Specific knowledge base ID to inspect')
    parser.add_argument('--collection', type=str, help='Specific ChromaDB collection to inspect')
    parser.add_argument('--search', type=str, help='Search query to test in ChromaDB')
    parser.add_argument('--n-results', type=int, default=5, help='Number of search results to return')
    parser.add_argument('--direct-chroma', action='store_true', help='Use direct ChromaDB access for debugging')
    parser.add_argument('--recreate-collection', action='store_true', help='Recreate missing ChromaDB collection')
    
    args = parser.parse_args()
    
    inspector = KnowledgeBaseInspector()
    
    try:
        # List all knowledge bases
        print("🔍 KNOWLEDGE BASE INSPECTOR")
        print("=" * 60)
        
        kbs = inspector.list_all_knowledge_bases()
        if not kbs:
            print("No knowledge bases found.")
            return
        
        print(f"Found {len(kbs)} knowledge base(s):")
        
        # If specific KB ID is provided, inspect only that one
        if args.kb_id:
            kb = inspector.get_knowledge_base(args.kb_id)
            if kb:
                inspector.print_knowledge_base_summary(kb)
                
                # Inspect contents from ChromaDB
                if args.direct_chroma:
                    print(f"\n🔍 Using direct ChromaDB access for debugging...")
                    contents = inspector.get_kb_contents_direct_chroma(args.kb_id)
                    if contents:
                        print(f"\nRaw ChromaDB Documents ({len(contents)}):")
                        for i, doc in enumerate(contents):
                            print(f"\nDocument {i+1}:")
                            print(f"  Raw content: {doc}")
                    else:
                        print(f"\nNo raw documents found in ChromaDB collection.")
                else:
                    contents = inspector.get_kb_contents(args.kb_id)
                    if contents:
                        print(f"\nDetailed Content Information (from KnowledgeBaseService):")
                        for content in contents:
                            inspector.print_content_details(content)
                    else:
                        print(f"\nNo content found in ChromaDB collection.")
                
                # Inspect ChromaDB collection
                if kb.chroma_collection_name:
                    print(f"\n🔍 Inspecting ChromaDB Collection: {kb.chroma_collection_name}")
                    collection_info = inspector.inspect_chroma_collection(kb.chroma_collection_name)
                    inspector.print_chroma_collection_info(collection_info)
                    
                    # Recreate collection if requested
                    if args.recreate_collection:
                        print(f"\n🔧 Recreating missing ChromaDB collection...")
                        if inspector.recreate_missing_collection(args.kb_id):
                            print(f"✅ Collection recreated successfully!")
                            # Now try to inspect it again
                            print(f"\n🔍 Re-inspecting recreated collection...")
                            collection_info = inspector.inspect_chroma_collection(kb.chroma_collection_name)
                            inspector.print_chroma_collection_info(collection_info)
                        else:
                            print(f"❌ Failed to recreate collection")
                    
                    # Perform search if query provided
                    if args.search:
                        print(f"\n🔍 Searching for: '{args.search}'")
                        search_results = inspector.search_in_collection(
                            kb.chroma_collection_name, 
                            args.search, 
                            args.n_results
                        )
                        inspector.print_search_results(search_results)
            else:
                print(f"Knowledge base with ID {args.kb_id} not found.")
                return
        
        # If specific collection is provided, inspect only that one
        elif args.collection:
            print(f"\n🔍 Inspecting ChromaDB Collection: {args.collection}")
            collection_info = inspector.inspect_chroma_collection(args.collection)
            inspector.print_chroma_collection_info(collection_info)
            
            # Perform search if query provided
            if args.search:
                print(f"\n🔍 Searching for: '{args.search}'")
                search_results = inspector.search_in_collection(
                    args.collection, 
                    args.search, 
                    args.n_results
                )
                inspector.print_search_results(search_results)
        
        # Default: show summary of all knowledge bases
        else:
            for kb in kbs:
                inspector.print_knowledge_base_summary(kb)
            
            print(f"\n💡 Use --kb-id <id> to inspect a specific knowledge base")
            print(f"💡 Use --collection <name> to inspect a specific ChromaDB collection")
            print(f"💡 Use --search <query> to test search functionality")
            print(f"💡 Use --direct-chroma with --kb-id to bypass KnowledgeBaseService for debugging")
            print(f"💡 Use --recreate-collection with --kb-id to recreate missing ChromaDB collections")
    
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        print(f"\nError during inspection: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
