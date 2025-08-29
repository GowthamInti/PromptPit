# backend/app/schemas/knowledge_base_schemas.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# Knowledge Base Schemas
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    user_id: str = "default_user"

class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class KnowledgeBaseResponse(BaseModel):
    id: int
    uuid: str
    name: str
    description: Optional[str]
    user_id: str
    chroma_collection_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    content_count: int = 0  # Number of contents in the KB

    class Config:
        from_attributes = True

# Knowledge Base Content Schemas
class KnowledgeBaseContentResponse(BaseModel):
    id: int
    knowledge_base_id: int
    content_type: str
    original_filename: str
    file_size: Optional[int]
    mime_type: Optional[str]
    extracted_text: Optional[str]
    summary: Optional[str]
    content_metadata: Optional[Dict[str, Any]]
    processing_status: str
    processing_error: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class KnowledgeBaseContentCreate(BaseModel):
    knowledge_base_id: int
    content_type: str
    original_filename: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None

class KnowledgeBaseContentUpdate(BaseModel):
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    content_metadata: Optional[Dict[str, Any]] = None
    chroma_document_id: Optional[str] = None
    processing_status: Optional[str] = None
    processing_error: Optional[str] = None

# Upload and Processing Schemas
class FileUploadResponse(BaseModel):
    message: str
    uploaded_files: List[str]
    processing_status: str

class ProcessingStatusResponse(BaseModel):
    content_id: int
    status: str
    progress: Optional[float] = None
    error: Optional[str] = None

# Search and Query Schemas
class KnowledgeBaseSearchRequest(BaseModel):
    query: str
    limit: int = 10
    filter_type: Optional[str] = None  # 'document', 'image', 'all'

class KnowledgeBaseSearchResponse(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    total_results: int
    search_time_ms: float

# List and Pagination Schemas
class KnowledgeBaseListResponse(BaseModel):
    knowledge_bases: List[KnowledgeBaseResponse]
    total_count: int
    page: int
    page_size: int

class KnowledgeBaseContentListResponse(BaseModel):
    contents: List[KnowledgeBaseContentResponse]
    total_count: int
    page: int
    page_size: int
