# backend/app/services/knowledge_base_service.py
import os
import uuid
import shutil
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile
from datetime import datetime

from app.database.models import KnowledgeBase
from app.services.chroma_service import ChromaService
from app.services.provider_service import ProviderService

class KnowledgeBaseService:
    """Service for managing knowledge bases and their contents using ChromaDB only"""
    
    def __init__(self, db: Session, upload_directory: str = "./uploads/knowledge_bases", chroma_persist_directory: str = "./chroma_db"):
        self.db = db
        self.upload_directory = upload_directory
        self.chroma_service = ChromaService(persist_directory=chroma_persist_directory)
        self.provider_service = ProviderService(db)
        
        # Ensure upload directory exists
        os.makedirs(upload_directory, exist_ok=True)
    
    def create_knowledge_base(self, name: str, description: Optional[str] = None, 
                            user_id: str = "default_user") -> KnowledgeBase:
        """Create a new knowledge base with ChromaDB collection"""
        try:
            # Generate unique collection name
            collection_name = f"kb_{user_id}_{uuid.uuid4().hex[:8]}"
            
            # Create ChromaDB collection
            self.chroma_service.create_collection(
                collection_name=collection_name,
                metadata={
                    "name": name,
                    "description": description,
                    "user_id": user_id,
                    "created_at": datetime.now().isoformat()
                }
            )
            
            # Create database record
            knowledge_base = KnowledgeBase(
                name=name,
                description=description,
                user_id=user_id,
                chroma_collection_name=collection_name
            )
            
            self.db.add(knowledge_base)
            self.db.commit()
            self.db.refresh(knowledge_base)
            
            return knowledge_base
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create knowledge base: {str(e)}")
    
    def get_knowledge_base(self, kb_id: int) -> Optional[KnowledgeBase]:
        """Get a knowledge base by ID"""
        return self.db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    
    def get_knowledge_base_by_uuid(self, uuid: str) -> Optional[KnowledgeBase]:
        """Get a knowledge base by UUID"""
        return self.db.query(KnowledgeBase).filter(KnowledgeBase.uuid == uuid).first()
    
    def list_knowledge_bases(self, user_id: str = "default_user") -> List[KnowledgeBase]:
        """List all knowledge bases for a user"""
        knowledge_bases = self.db.query(KnowledgeBase).filter(
            KnowledgeBase.user_id == user_id,
            KnowledgeBase.is_active == True
        ).all()
        
        # Add content count from ChromaDB to each knowledge base
        for kb in knowledge_bases:
            try:
                chroma_info = self.chroma_service.get_collection_info(kb.chroma_collection_name)
                kb.content_count = chroma_info['document_count']
            except Exception:
                kb.content_count = 0
        
        return knowledge_bases
    
    def update_knowledge_base(self, kb_id: int, **kwargs) -> Optional[KnowledgeBase]:
        """Update a knowledge base"""
        knowledge_base = self.get_knowledge_base(kb_id)
        if not knowledge_base:
            return None
        
        for key, value in kwargs.items():
            if hasattr(knowledge_base, key):
                setattr(knowledge_base, key, value)
        
        knowledge_base.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(knowledge_base)
        
        return knowledge_base
    
    def delete_knowledge_base(self, kb_id: int) -> bool:
        """Delete a knowledge base and its ChromaDB collection"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                return False
            
            # Delete ChromaDB collection
            self.chroma_service.delete_collection(knowledge_base.chroma_collection_name)
            
            # Delete uploaded files
            kb_upload_dir = os.path.join(self.upload_directory, str(kb_id))
            if os.path.exists(kb_upload_dir):
                shutil.rmtree(kb_upload_dir)
            
            # Delete database record
            self.db.delete(knowledge_base)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to delete knowledge base: {str(e)}")


    async def add_unified_content(self, kb_id: int, summary: str = None,
                                 provider_id: int = 1, model_id: int = 1) -> Dict[str, Any]:
        """Add multiple content items as a single unified content record directly to ChromaDB"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                raise Exception("Knowledge base not found")
            
            # Initialize content parts for filename
            content_parts = ["summary"]
            
            unified_filename = f"Unified Content - {' + '.join(content_parts)} - {datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Create metadata for ChromaDB (only primitive types allowed)
            metadata = {
                'content_type': 'unified',
                'original_filename': unified_filename,
                'mime_type': 'application/unified',
                'created_at': datetime.now().isoformat(),
                'provider_id': int(provider_id),  # Ensure it's an int
                'model_id': int(model_id),  # Ensure it's an int
                'file_count': 0,  # Use count instead of list
                'note': 'Content processed by LLM and stored in ChromaDB'
            }
            
            # Add directly to ChromaDB
            document_id = f"unified_{uuid.uuid4().hex[:8]}"
            self.chroma_service.add_documents(
                collection_name=knowledge_base.chroma_collection_name,
                documents=[summary],
                metadatas=[metadata],
                ids=[document_id]
            )
            
            print(f"Unified content added directly to ChromaDB with ID: {document_id}")
            
            # Return ChromaDB document info instead of SQL record
            return {
                'id': document_id,
                'knowledge_base_id': kb_id,
                'content_type': 'unified',
                'original_filename': unified_filename,
                'extracted_text': summary or "Unified content processed by LLM",
                'summary': summary or "Unified content processed by LLM",
                'content_metadata': metadata,
                'chroma_document_id': document_id,
                'processing_status': 'completed',
                'source': 'chromadb'
            }
            
        except Exception as e:
            print(f"Error adding unified content to ChromaDB: {str(e)}")
            raise Exception(f"Failed to add unified content to ChromaDB: {str(e)}")

    async def search_knowledge_base(self, kb_id: int, query: str, 
                                  n_results: int = 10) -> Dict[str, Any]:
        """Search a knowledge base"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                raise Exception("Knowledge base not found")
            
            # Search ChromaDB
            results = self.chroma_service.search_documents(
                collection_name=knowledge_base.chroma_collection_name,
                query=query,
                n_results=n_results
            )
            
            return results
            
        except Exception as e:
            raise Exception(f"Failed to search knowledge base: {str(e)}")

    def get_knowledge_base_contents(self, kb_id: int, 
                                  content_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get contents of a knowledge base from ChromaDB"""
        try:
            # Use ChromaDB method by default
            result = self.get_knowledge_base_contents_from_chroma(kb_id)
            contents = result['contents']
            
            # Filter by content type if specified
            if content_type:
                contents = [c for c in contents if c['content_type'] == content_type]
            
            return contents
            
        except Exception as e:
            raise Exception(f"Failed to get contents: {str(e)}")

    def get_knowledge_base_contents_from_chroma(self, kb_id: int, 
                                              limit: Optional[int] = None,
                                              offset: Optional[int] = None) -> Dict[str, Any]:
        """Get contents of a knowledge base directly from ChromaDB"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                raise Exception("Knowledge base not found")
            
            print(f"Fetching contents from ChromaDB collection: {knowledge_base.chroma_collection_name}")
            
            # Get all documents from ChromaDB collection
            chroma_results = self.chroma_service.get_all_documents(
                collection_name=knowledge_base.chroma_collection_name,
                limit=limit,
                offset=offset
            )
            
            
            if not chroma_results:
                print("Warning: ChromaDB returned None or empty results")
                return {
                    'contents': [],
                    'total_count': 0,
                    'returned_count': 0,
                    'source': 'chromadb',
                    'collection_name': knowledge_base.chroma_collection_name
                }
            
            # Transform ChromaDB results to match expected format
            contents = []
            for doc in chroma_results['documents']:
                # Create a content object from ChromaDB data
                # Handle both old and new content formats
                metadata = doc.get('metadata', {})
                
                content = {
                    'id': doc['id'],
                    'knowledge_base_id': kb_id,
                    'content_type': metadata.get('content_type', 'unknown'),
                    'original_filename': metadata.get('original_filename', 'Unknown'),
                    'file_size': metadata.get('file_size', 0),
                    'mime_type': metadata.get('mime_type', 'text/plain'),
                    'extracted_text': doc['document'],  # In ChromaDB, this contains the summary
                    'summary': doc['document'],  # Same as extracted_text since we only store summaries
                    'content_metadata': metadata,
                    'chroma_document_id': doc['id'],
                    'processing_status': 'completed',  # If it's in ChromaDB, it's processed
                    'processing_error': None,
                    'created_at': metadata.get('created_at'),
                    'updated_at': metadata.get('updated_at', metadata.get('created_at')),
                    'provider_id': metadata.get('provider_id', 1),
                    'model_id': metadata.get('model_id', 1),
                    'note': metadata.get('note', ''),
                    'file_count': metadata.get('file_count', 0)
                }
                contents.append(content)
            
            return {
                'contents': contents,
                'total_count': chroma_results['total_count'],
                'returned_count': len(contents),
                'source': 'chromadb',
                'collection_name': knowledge_base.chroma_collection_name
            }
            
        except Exception as e:
            raise Exception(f"Failed to get contents from ChromaDB: {str(e)}")

    def get_content_from_chroma(self, kb_id: int, content_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific content item directly from ChromaDB"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                raise Exception("Knowledge base not found")
            
            # Get document from ChromaDB by ID
            doc = self.chroma_service.get_document_by_id(
                collection_name=knowledge_base.chroma_collection_name,
                document_id=content_id
            )
            
            if not doc:
                return None
            
            # Transform to expected format
            metadata = doc.get('metadata', {})
            
            content = {
                'id': doc['id'],
                'knowledge_base_id': kb_id,
                'content_type': metadata.get('content_type', 'unknown'),
                'original_filename': metadata.get('original_filename', 'Unknown'),
                'file_size': metadata.get('file_size', 0),
                'mime_type': metadata.get('mime_type', 'text/plain'),
                'extracted_text': doc['document'],  # In ChromaDB, this contains the summary
                'summary': doc['document'],  # Same as extracted_text since we only store summaries
                'content_metadata': metadata,
                'chroma_document_id': doc['id'],
                'processing_status': 'completed',
                'processing_error': None,
                'created_at': metadata.get('created_at'),
                'updated_at': metadata.get('updated_at', metadata.get('created_at')),
                'provider_id': metadata.get('provider_id', 1),
                'model_id': metadata.get('model_id', 1),
                'note': metadata.get('note', ''),
                'file_count': metadata.get('file_count', 0)
            }
            
            return content
            
        except Exception as e:
            raise Exception(f"Failed to get content from ChromaDB: {str(e)}")


    def delete_content(self, content_id: str, kb_id: int) -> bool:
        """Delete content directly from ChromaDB"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                return False
            
            # Delete from ChromaDB
            self.chroma_service.delete_document(
                collection_name=knowledge_base.chroma_collection_name,
                document_id=content_id
            )
            
            print(f"Content {content_id} deleted from ChromaDB")
            return True
            
        except Exception as e:
            raise Exception(f"Failed to delete content from ChromaDB: {str(e)}")
