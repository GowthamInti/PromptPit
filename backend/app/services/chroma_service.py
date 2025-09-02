# backend/app/services/chroma_service.py
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from typing import List, Dict, Any, Optional
import os
import json
from datetime import datetime
import sys
from chromadb.utils import embedding_functions


class ChromaService:
    """Service for managing ChromaDB operations for knowledge bases"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        """Initialize ChromaDB client with persistent storage"""
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)
        
        # Print ChromaDB version for debugging
        print(f"ChromaDB version: {chromadb.__version__}")
        print(f"Python version: {sys.version}")
        
        try:
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            print(f"ChromaDB client initialized successfully with persist directory: {persist_directory}")
            
            # Test client connection
            try:
                collections = self.client.list_collections()
                print(f"Successfully listed {len(collections)} existing collections")
            except Exception as test_error:
                print(f"Warning: Could not list collections during initialization: {str(test_error)}")
                
        except Exception as e:
            print(f"Error initializing ChromaDB client: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    def create_collection(self, collection_name: str, metadata: Optional[Dict[str, Any]] = None) -> chromadb.Collection:
        """Create a new ChromaDB collection with explicit default embedding function"""
        try:
            # Check if collection already exists
            try:
                existing_collections = self.client.list_collections()
                collection_names = [col.name for col in existing_collections]
                print(f"Existing collections: {collection_names}")
                
                if collection_name in collection_names:
                    print(f"Collection '{collection_name}' already exists, returning existing collection")
                    return self.client.get_collection(name=collection_name)
            except Exception as list_error:
                print(f"Warning: Could not list existing collections: {str(list_error)}")
                # Continue with collection creation
            
            # Ensure metadata only contains primitive types
            safe_metadata = {}
            if metadata:
                for key, value in metadata.items():
                    if isinstance(value, (str, int, float, bool)) or value is None:
                        safe_metadata[key] = value
                    else:
                        print(f"Warning: Converting non-primitive metadata value for key '{key}': {value} -> {str(value)}")
                        safe_metadata[key] = str(value)
            
            # Create new collection with EXPLICIT default embedding function
            print(f"Attempting to create collection '{collection_name}'")
            ef = embedding_functions.DefaultEmbeddingFunction()
            collection = self.client.create_collection(
                name=collection_name,
                metadata=safe_metadata or {},
                embedding_function=ef
            )
            print(f"Collection '{collection_name}' created successfully with default embedding function")
            
            return collection
            
        except Exception as e:
            print(f"Error creating ChromaDB collection '{collection_name}': {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to create ChromaDB collection '{collection_name}': {str(e)}")
    
    def get_collection(self, collection_name: str) -> chromadb.Collection:
        """Get an existing ChromaDB collection"""
        try:
            print(f"Getting ChromaDB collection: {collection_name}")

            
            # Validate collection name
            if not collection_name or not isinstance(collection_name, str):
                raise ValueError(f"Invalid collection name: {collection_name}")
            
            if len(collection_name.strip()) == 0:
                raise ValueError("Collection name cannot be empty")
            
            collection = self.client.get_collection(name=collection_name,
                                                    embedding_function=embedding_functions.DefaultEmbeddingFunction()
                                                )
            print(f"Collection retrieved successfully: {collection}")
            return collection
        except Exception as e:
            print(f"Error getting collection '{collection_name}': {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Collection '{collection_name}' not found: {str(e)}")
    
    def delete_collection(self, collection_name: str) -> bool:
        """Delete a ChromaDB collection"""
        try:
            self.client.delete_collection(name=collection_name)
            return True
        except Exception as e:
            raise Exception(f"Failed to delete collection '{collection_name}': {str(e)}")
    
    def add_documents(self, collection_name: str, documents: List[str], 
                     metadatas: List[Dict[str, Any]], ids: List[str]) -> List[str]:
        """Add documents to a ChromaDB collection with automatic embedding generation"""
        try:
            # Validate input parameters
            if not documents or not metadatas or not ids:
                raise ValueError("Documents, metadatas, and ids cannot be empty")
            
            # Ensure metadata only contains primitive types
            safe_metadatas = []
            for metadata in metadatas:
                safe_metadata = {}
                if metadata:
                    for key, value in metadata.items():
                        if isinstance(value, (str, int, float, bool)) or value is None:
                            safe_metadata[key] = value
                        else:
                            print(f"Warning: Converting non-primitive metadata value for key '{key}': {value} -> {str(value)}")
                            safe_metadata[key] = str(value)
                safe_metadatas.append(safe_metadata)
            
            collection = self.get_collection(collection_name)
           
            # Add documents to collection - ChromaDB will auto-generate embeddings
            try:
                result = collection.add(
                    documents=documents,
                    metadatas=safe_metadatas,
                    ids=ids
                )
                print(f"ChromaDB add() call successful: {result}")
            except Exception as add_error:
                print(f"ChromaDB add() call failed: {str(add_error)}")

                raise add_error
            
            # Verify embeddings were generated
            print(f"Added {len(ids)} documents to collection '{collection_name}' successfully")
                        
            return ids
            
        except Exception as e:
            print(f"Error adding documents to ChromaDB collection '{collection_name}': {str(e)}")

            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to add documents to collection '{collection_name}': {str(e)}")
    
    def search_documents(self, collection_name: str, query: str, 
                        n_results: int = 10, 
                        filter_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Search documents in a ChromaDB collection"""
        try:
            collection = self.get_collection(collection_name)
            
            # Perform search
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=filter_metadata
            )
            
            # Format results
            formatted_results = []
            if (results is not None and 
                isinstance(results, dict) and
                results.get('ids') is not None and 
                results.get('documents') is not None and 
                results.get('metadatas') is not None and
                hasattr(results['ids'], '__len__') and 
                len(results['ids']) > 0 and
                hasattr(results['ids'][0], '__len__') and 
                len(results['ids'][0]) > 0):
                
                for i in range(len(results['ids'][0])):
                    formatted_results.append({
                        'id': results['ids'][0][i],
                        'document': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'distance': results['distances'][0][i] if (results.get('distances') and 
                                                                 hasattr(results['distances'], '__len__') and 
                                                                 len(results['distances']) > 0 and
                                                                 hasattr(results['distances'][0], '__len__') and 
                                                                 i < len(results['distances'][0])) else None
                    })
            
            return {
                'query': query,
                'results': formatted_results,
                'total_results': len(formatted_results)
            }
            
        except Exception as e:
            raise Exception(f"Failed to search collection '{collection_name}': {str(e)}")
    
    def update_document(self, collection_name: str, document_id: str, 
                       document: str, metadata: Dict[str, Any]) -> bool:
        """Update a document in a ChromaDB collection"""
        try:
            collection = self.get_collection(collection_name)
            
            # Update document
            collection.update(
                ids=[document_id],
                documents=[document],
                metadatas=[metadata]
            )
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to update document '{document_id}' in collection '{collection_name}': {str(e)}")
    
    def delete_document(self, collection_name: str, document_id: str) -> bool:
        """Delete a document from a ChromaDB collection"""
        try:
            collection = self.get_collection(collection_name)
            
            # Delete document
            collection.delete(ids=[document_id])
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to delete document '{document_id}' from collection '{collection_name}': {str(e)}")
    
    def get_collection_info(self, collection_name: str) -> Dict[str, Any]:
        """Get information about a ChromaDB collection"""
        try:
            collection = self.get_collection(collection_name)
            count = collection.count()
            
            return {
                'name': collection_name,
                'document_count': count,
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Failed to get collection info for '{collection_name}': {str(e)}")
    
    def list_collections(self) -> List[Dict[str, Any]]:
        """List all ChromaDB collections"""
        try:
            collections = self.client.list_collections()
            collection_info = []
            
            for collection in collections:
                info = self.get_collection_info(collection.name)
                collection_info.append(info)
            
            return collection_info
            
        except Exception as e:
            raise Exception(f"Failed to list collections: {str(e)}")
    
    def export_collection(self, collection_name: str, export_path: str) -> bool:
        """Export a collection to disk"""
        try:
            collection = self.get_collection(collection_name)
            
            # Create export directory
            os.makedirs(export_path, exist_ok=True)
            
            # Export collection
            collection.export_to_disk(export_path)
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to export collection '{collection_name}': {str(e)}")
    
    def import_collection(self, collection_name: str, import_path: str) -> bool:
        """Import a collection from disk"""
        try:
            # Import collection
            self.client.import_from_disk(import_path, collection_name)
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to import collection '{collection_name}': {str(e)}")

    def get_all_documents(self, collection_name: str, 
                         limit: Optional[int] = None,
                         offset: Optional[int] = None) -> Dict[str, Any]:
        """Get all documents from a ChromaDB collection"""
        try:
            collection = self.get_collection(collection_name)
            
            # Get total count
            total_count = collection.count()
            
            # Get all documents
            results = collection.get(
                limit=limit,
                offset=offset,
                # include=["embeddings"]
            )
            
            
            # Format results with proper null checks
            formatted_results = []
            if (results is not None and 
                isinstance(results, dict) and
                results.get('ids') is not None and 
                results.get('documents') is not None and 
                results.get('metadatas') is not None):
                
                # Safe length check
                ids = results['ids']
                documents = results['documents']
                metadatas = results['metadatas']
                
                if (hasattr(ids, '__len__') and 
                    hasattr(documents, '__len__') and 
                    hasattr(metadatas, '__len__') and
                    len(ids) > 0 and len(ids) == len(documents) == len(metadatas)):
                    
                    for i in range(len(ids)):
                        formatted_results.append({
                            'id': ids[i],
                            'document': documents[i],
                            'metadata': metadatas[i],
                            'embedding': results['embeddings'][i] if results.get('embeddings') and i < len(results['embeddings']) else None
                        })
                else:
                    print(f"Warning: Mismatched array lengths in ChromaDB results: ids={len(ids) if hasattr(ids, '__len__') else 'unknown'}, docs={len(documents) if hasattr(documents, '__len__') else 'unknown'}, metas={len(metadatas) if hasattr(metadatas, '__len__') else 'unknown'}")
            else:
                print(f"Warning: Empty or invalid results from ChromaDB: {results}")
                # Return empty results structure
                return {
                    'collection_name': collection_name,
                    'total_count': 0,
                    'returned_count': 0,
                    'documents': []
                }
            
            return {
                'collection_name': collection_name,
                'total_count': total_count,
                'returned_count': len(formatted_results),
                'documents': formatted_results
            }
            
        except Exception as e:
            raise Exception(f"Failed to get documents from collection '{collection_name}': {str(e)}")

    def get_document_by_id(self, collection_name: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific document by ID from a ChromaDB collection"""
        try:
            collection = self.get_collection(collection_name)
            
            # Get document by ID
            results = collection.get(
                ids=[document_id]
            )
            
            if (results is not None and 
                isinstance(results, dict) and
                results.get('ids') is not None and 
                results.get('documents') is not None and 
                results.get('metadatas') is not None and
                hasattr(results['ids'], '__len__') and 
                len(results['ids']) > 0):
                
                return {
                    'id': results['ids'][0],
                    'document': results['documents'][0],
                    'metadata': results['metadatas'][0],
                    'embedding': results['embeddings'][0] if (results.get('embeddings') and 
                                                             hasattr(results['embeddings'], '__len__') and 
                                                             len(results['embeddings']) > 0) else None
                }
            
            return None
            
        except Exception as e:
            raise Exception(f"Failed to get document '{document_id}' from collection '{collection_name}': {str(e)}")

    def get_documents_by_metadata(self, collection_name: str, 
                                 metadata_filter: Dict[str, Any],
                                 limit: Optional[int] = None) -> Dict[str, Any]:
        """Get documents from a ChromaDB collection filtered by metadata"""
        try:
            collection = self.get_collection(collection_name)
            
            # Get documents with metadata filter
            results = collection.get(
                where=metadata_filter,
                limit=limit
            )
            
            # Format results with proper null checks
            formatted_results = []
            if (results is not None and 
                isinstance(results, dict) and
                results.get('ids') is not None and 
                results.get('documents') is not None and 
                results.get('metadatas') is not None):
                
                # Safe length check
                ids = results['ids']
                documents = results['documents']
                metadatas = results['metadatas']
                
                if (hasattr(ids, '__len__') and 
                    hasattr(documents, '__len__') and 
                    hasattr(metadatas, '__len__') and
                    len(ids) > 0 and len(ids) == len(documents) == len(metadatas)):
                    
                    for i in range(len(ids)):
                        formatted_results.append({
                            'id': ids[i],
                            'document': documents[i],
                            'metadata': metadatas[i],
                            'embedding': results['embeddings'][i] if (results.get('embeddings') and 
                                                                     hasattr(results['embeddings'], '__len__') and 
                                                                     i < len(results['embeddings'])) else None
                        })
                else:
                    print(f"Warning: Mismatched array lengths in ChromaDB results: ids={len(ids) if hasattr(ids, '__len__') else 'unknown'}, docs={len(documents) if hasattr(documents, '__len__') else 'unknown'}, metas={len(metadatas) if hasattr(metadatas, '__len__') else 'unknown'}")
            else:
                print(f"Warning: Empty or invalid results from ChromaDB: {results}")
                return {
                    'collection_name': collection_name,
                    'filter': metadata_filter,
                    'total_count': 0,
                    'documents': []
                }
            
            return {
                'collection_name': collection_name,
                'filter': metadata_filter,
                'total_count': len(formatted_results),
                'documents': formatted_results
            }
            
        except Exception as e:
            raise Exception(f"Failed to get documents with filter from collection '{collection_name}': {str(e)}")
