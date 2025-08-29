# backend/app/services/knowledge_base_service.py
import os
import uuid
import shutil
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile
from datetime import datetime

from app.database.models import KnowledgeBase, KnowledgeBaseContent
from app.services.chroma_service import ChromaService
from app.services.file_extraction_service import FileExtractionService
from app.services.provider_service import ProviderService

class KnowledgeBaseService:
    """Service for managing knowledge bases and their contents"""
    
    def __init__(self, db: Session, upload_directory: str = "./uploads/knowledge_bases"):
        self.db = db
        self.upload_directory = upload_directory
        self.chroma_service = ChromaService()
        self.file_extraction_service = FileExtractionService()
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
        
        # Add content count to each knowledge base
        for kb in knowledge_bases:
            kb.content_count = self.db.query(KnowledgeBaseContent).filter(
                KnowledgeBaseContent.knowledge_base_id == kb.id
            ).count()
        
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
            
            # Delete database record (cascades to contents)
            self.db.delete(knowledge_base)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to delete knowledge base: {str(e)}")
    
    async def upload_files(self, kb_id: int, files: List[UploadFile]) -> List[KnowledgeBaseContent]:
        """Upload files to a knowledge base"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                raise Exception("Knowledge base not found")
            
            # Create upload directory for this knowledge base
            kb_upload_dir = os.path.join(self.upload_directory, str(kb_id))
            os.makedirs(kb_upload_dir, exist_ok=True)
            
            uploaded_contents = []
            
            for file in files:
                # Generate unique filename
                file_extension = os.path.splitext(file.filename)[1]
                unique_filename = f"{uuid.uuid4().hex}{file_extension}"
                file_path = os.path.join(kb_upload_dir, unique_filename)
                
                # Save file
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Determine content type
                content_type = self._determine_content_type(file.filename)
                
                # Create content record
                content = KnowledgeBaseContent(
                    knowledge_base_id=kb_id,
                    content_type=content_type,
                    original_filename=file.filename,
                    file_path=file_path,
                    file_size=os.path.getsize(file_path),
                    mime_type=file.content_type,
                    processing_status='pending'
                )
                
                self.db.add(content)
                uploaded_contents.append(content)
            
            self.db.commit()
            
            # Refresh content objects to get IDs
            for content in uploaded_contents:
                self.db.refresh(content)
            
            return uploaded_contents
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to upload files: {str(e)}")

    async def add_text_content(self, kb_id: int, text: str, title: str = None, 
                              description: str = None) -> KnowledgeBaseContent:
        """Add text-only content to a knowledge base"""
        try:
            knowledge_base = self.get_knowledge_base(kb_id)
            if not knowledge_base:
                raise Exception("Knowledge base not found")
            
            print(f"Adding text content to KB {kb_id}: {text[:100]}...")
            
            # Create content record for text
            content = KnowledgeBaseContent(
                knowledge_base_id=kb_id,
                content_type='text',
                original_filename=title or f"Text Content {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                extracted_text=text,
                processing_status='pending'
            )
            
            # Store description in content_metadata if provided
            if description:
                content.content_metadata = {"description": description}
            
            self.db.add(content)
            self.db.commit()
            self.db.refresh(content)
            
            print(f"Text content added successfully with ID: {content.id}")
            return content
            
        except Exception as e:
            self.db.rollback()
            print(f"Error adding text content: {str(e)}")
            raise Exception(f"Failed to add text content: {str(e)}")
    
    async def process_content(self, content_id: int, provider_id: int = 1, model_id: int = 1, 
                            custom_summary: str = None, max_summary_tokens: int = 2000) -> bool:
        """Process uploaded content with LLM and add to ChromaDB"""
        try:
            print(f"Processing content {content_id} with provider {provider_id}, model {model_id}")
            
            content = self.db.query(KnowledgeBaseContent).filter(
                KnowledgeBaseContent.id == content_id
            ).first()
            
            if not content:
                raise Exception("Content not found")
            
            print(f"Content found: {content.content_type}, extracted_text length: {len(content.extracted_text) if content.extracted_text else 0}")
            
            knowledge_base = self.get_knowledge_base(content.knowledge_base_id)
            if not knowledge_base:
                raise Exception("Knowledge base not found")
            
            # Validate provider and model
            from app.database.models import Provider, Model
            provider = self.db.query(Provider).filter(Provider.id == provider_id).first()
            if not provider or not provider.is_active:
                raise Exception(f"Provider {provider_id} not found or inactive")
            
            model = self.db.query(Model).filter(Model.id == model_id, Model.provider_id == provider_id).first()
            if not model:
                raise Exception(f"Model {model_id} not found for provider {provider_id}")
            
            # Update status to processing
            content.processing_status = 'processing'
            self.db.commit()
            
            try:
                # Extract text from file if not already extracted (only for document/image content)
                if content.content_type in ['document', 'image'] and not content.extracted_text:
                    extracted_text = await self._extract_text_from_file(content)
                    content.extracted_text = extracted_text
                
                # For text content, extracted_text should already be set
                if content.content_type == 'text' and not content.extracted_text:
                    raise Exception("Text content must have extracted_text field set")
                
                # Use custom summary if provided, otherwise generate one
                if custom_summary:
                    print(f"Using custom summary: {custom_summary[:100]}...")
                    content.summary = custom_summary
                else:
                    print("Generating summary with LLM...")
                    summary = await self._generate_summary(content, provider_id, model_id, max_summary_tokens)
                    content.summary = summary
                    print(f"Generated summary: {summary[:100]}...")
                
                # Add to ChromaDB
                try:
                    print(f"Adding to ChromaDB collection: {knowledge_base.chroma_collection_name}")
                    chroma_doc_id = await self._add_to_chroma(content, knowledge_base.chroma_collection_name)
                    content.chroma_document_id = chroma_doc_id
                    print(f"Successfully added to ChromaDB with ID: {chroma_doc_id}")
                except Exception as chroma_error:
                    print(f"ChromaDB error: {str(chroma_error)}")
                    raise Exception(f"Failed to add to ChromaDB: {str(chroma_error)}")
                
                # Update status to completed
                content.processing_status = 'completed'
                content.updated_at = datetime.now()
                
                self.db.commit()
                print(f"Content {content_id} processed successfully")
                return True
                
            except Exception as e:
                # Update status to failed
                content.processing_status = 'failed'
                content.processing_error = str(e)
                self.db.commit()
                print(f"Error processing content {content_id}: {str(e)}")
                raise e
                
        except Exception as e:
            raise Exception(f"Failed to process content: {str(e)}")
    
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
                                  content_type: Optional[str] = None) -> List[KnowledgeBaseContent]:
        """Get contents of a knowledge base"""
        query = self.db.query(KnowledgeBaseContent).filter(
            KnowledgeBaseContent.knowledge_base_id == kb_id
        )
        
        if content_type:
            query = query.filter(KnowledgeBaseContent.content_type == content_type)
        
        return query.order_by(KnowledgeBaseContent.created_at.desc()).all()
    
    async def update_content_summary(self, content_id: int, summary: str) -> bool:
        """Update content summary and re-index in ChromaDB"""
        try:
            content = self.db.query(KnowledgeBaseContent).filter(
                KnowledgeBaseContent.id == content_id
            ).first()
            
            if not content:
                return False
            
            knowledge_base = self.get_knowledge_base(content.knowledge_base_id)
            
            # Update summary
            content.summary = summary
            content.updated_at = datetime.now()
            
            # Re-index in ChromaDB if already indexed
            if content.chroma_document_id:
                # Delete old document
                self.chroma_service.delete_document(
                    collection_name=knowledge_base.chroma_collection_name,
                    document_id=content.chroma_document_id
                )
                
                # Add updated document
                chroma_doc_id = await self._add_to_chroma(content, knowledge_base.chroma_collection_name)
                content.chroma_document_id = chroma_doc_id
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to update content summary: {str(e)}")

    def delete_content(self, content_id: int) -> bool:
        """Delete content from knowledge base"""
        try:
            content = self.db.query(KnowledgeBaseContent).filter(
                KnowledgeBaseContent.id == content_id
            ).first()
            
            if not content:
                return False
            
            knowledge_base = self.get_knowledge_base(content.knowledge_base_id)
            
            # Delete from ChromaDB
            if content.chroma_document_id:
                self.chroma_service.delete_document(
                    collection_name=knowledge_base.chroma_collection_name,
                    document_id=content.chroma_document_id
                )
            
            # Delete file
            if content.file_path and os.path.exists(content.file_path):
                os.remove(content.file_path)
            
            # Delete database record
            self.db.delete(content)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to delete content: {str(e)}")
    
    def _determine_content_type(self, filename: str) -> str:
        """Determine content type based on file extension"""
        ext = os.path.splitext(filename)[1].lower()
        
        if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']:
            return 'image'
        elif ext in ['.pdf', '.docx', '.doc', '.txt', '.md']:
            return 'document'
        else:
            return 'document'  # Default to document
    
    async def _extract_text_from_file(self, content: KnowledgeBaseContent) -> str:
        """Extract text from uploaded file"""
        try:
            # For now, use the existing file extraction service
            # In the future, we can add image processing with OCR
            if content.content_type == 'document':
                # Create a mock UploadFile object for the file extraction service
                class MockUploadFile:
                    def __init__(self, file_path, filename):
                        self.file_path = file_path
                        self.filename = filename
                    
                    async def read(self):
                        with open(self.file_path, 'rb') as f:
                            return f.read()
                
                mock_file = MockUploadFile(content.file_path, content.original_filename)
                extracted_texts = await self.file_extraction_service.extract_text_from_files([mock_file])
                return extracted_texts[0] if extracted_texts else ""
            
            elif content.content_type == 'image':
                # For images, we'll return a placeholder for now
                # In the future, implement OCR and image description
                return f"Image file: {content.original_filename}"
            
            return ""
            
        except Exception as e:
            raise Exception(f"Failed to extract text from file: {str(e)}")
    
    async def _generate_summary(self, content: KnowledgeBaseContent, 
                              provider_id: int, model_id: int, max_tokens: int = 2000) -> str:
        """Generate summary using LLM"""
        try:
            if not content.extracted_text:
                return "No text content to summarize"
            
            # Create prompt for summarization
            # Limit content to first 15000 characters to allow for more comprehensive summaries
            content_preview = content.extracted_text[:15000] if len(content.extracted_text) > 15000 else content.extracted_text
            
            prompt_text = f"""
            Please provide a comprehensive and detailed summary of the following content. 
            Your summary should be thorough and capture all important information for knowledge retrieval purposes.
            
            Guidelines for your summary:
            1. Include all key concepts, facts, and main ideas
            2. Preserve important details, numbers, dates, and specific terminology
            3. Maintain the logical structure and relationships between concepts
            4. Include any methodologies, processes, or step-by-step procedures mentioned
            5. Highlight important conclusions, findings, or recommendations
            6. Make it searchable by including relevant keywords and phrases
            7. Aim for completeness while maintaining clarity and readability
            
            Content to summarize:
            {content_preview}
            
            Detailed Summary:
            """
            
            # Use provider service to generate summary
            result = await self.provider_service.run_prompt({
                "provider_id": provider_id,
                "model_id": model_id,
                "text": prompt_text,
                "system_prompt": "You are a knowledge extraction specialist that creates detailed, comprehensive summaries for information retrieval systems. Your summaries should be thorough, well-structured, and preserve all critical information including specific details, terminology, and relationships between concepts. Focus on creating summaries that will enable accurate semantic search and knowledge retrieval.",
                "temperature": 0.3,
                "max_tokens": max_tokens  # Configurable token limit
            })
            
            return result.get('output_text', 'Summary generation failed')
            
        except Exception as e:
            raise Exception(f"Failed to generate summary: {str(e)}")
    
    async def _add_to_chroma(self, content: KnowledgeBaseContent, 
                            collection_name: str) -> str:
        """Add content to ChromaDB"""
        try:
            print(f"Adding content {content.id} to ChromaDB collection {collection_name}")
            
            # Create document text for ChromaDB
            document_text = content.summary if content.summary else content.extracted_text
            
            if not document_text:
                raise Exception("No text content to add to vector database")
            
            print(f"Document text length: {len(document_text)}")
            
            # Create metadata
            metadata = {
                "content_id": str(content.id),
                "content_type": content.content_type,
                "original_filename": content.original_filename,
                "file_size": content.file_size or 0,
                "mime_type": content.mime_type or "text/plain",
                "created_at": content.created_at.isoformat()
            }
            
            # Ensure collection exists
            try:
                self.chroma_service.get_collection(collection_name)
            except Exception:
                # Create collection if it doesn't exist
                self.chroma_service.create_collection(
                    collection_name=collection_name,
                    metadata={
                        "name": f"Knowledge Base Collection",
                        "created_at": datetime.now().isoformat()
                    }
                )
            
            # Add to ChromaDB
            document_id = f"doc_{content.id}_{uuid.uuid4().hex[:8]}"
            print(f"Adding document with ID: {document_id}")
            
            self.chroma_service.add_documents(
                collection_name=collection_name,
                documents=[document_text],
                metadatas=[metadata],
                ids=[document_id]
            )
            
            print(f"Successfully added document to ChromaDB")
            return document_id
            
        except Exception as e:
            raise Exception(f"Failed to add to ChromaDB: {str(e)}")
