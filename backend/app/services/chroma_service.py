# backend/app/services/chroma_service.py
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import os
import json
from datetime import datetime

class ChromaService:
    """Service for managing ChromaDB operations for knowledge bases"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        """Initialize ChromaDB client with persistent storage"""
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
    
    def create_collection(self, collection_name: str, metadata: Optional[Dict[str, Any]] = None) -> chromadb.Collection:
        """Create a new ChromaDB collection"""
        try:
            # Check if collection already exists
            existing_collections = self.client.list_collections()
            collection_names = [col.name for col in existing_collections]
            
            if collection_name in collection_names:
                return self.client.get_collection(name=collection_name)
            
            # Create new collection
            collection = self.client.create_collection(
                name=collection_name,
                metadata=metadata or {}
            )
            return collection
            
        except Exception as e:
            raise Exception(f"Failed to create ChromaDB collection '{collection_name}': {str(e)}")
    
    def get_collection(self, collection_name: str) -> chromadb.Collection:
        """Get an existing ChromaDB collection"""
        try:
            return self.client.get_collection(name=collection_name)
        except Exception as e:
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
        """Add documents to a ChromaDB collection"""
        try:
            collection = self.get_collection(collection_name)
            
            # Add documents to collection
            result = collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            return ids
            
        except Exception as e:
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
            if results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    formatted_results.append({
                        'id': results['ids'][0][i],
                        'document': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'distance': results['distances'][0][i] if 'distances' in results else None
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
