# backend/app/api/knowledge_bases.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import asyncio

from app.database.connection import get_db
from app.services.knowledge_base_service import KnowledgeBaseService
from app.services.provider_service import ProviderService
from app.schemas.knowledge_base_schemas import (
    KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseResponse,
    KnowledgeBaseContentResponse, FileUploadResponse, ProcessingStatusResponse,
    KnowledgeBaseSearchRequest, KnowledgeBaseSearchResponse,
    KnowledgeBaseListResponse, KnowledgeBaseContentListResponse
)

router = APIRouter()

# Knowledge Base Management Endpoints
@router.post("/knowledge-bases", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    kb_data: KnowledgeBaseCreate,
    db: Session = Depends(get_db)
):
    """Create a new knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        knowledge_base = service.create_knowledge_base(
            name=kb_data.name,
            description=kb_data.description,
            user_id=kb_data.user_id
        )
        
        return KnowledgeBaseResponse.from_orm(knowledge_base)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/knowledge-bases", response_model=KnowledgeBaseListResponse)
async def list_knowledge_bases(
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """List all knowledge bases for a user"""
    try:
        service = KnowledgeBaseService(db)
        knowledge_bases = service.list_knowledge_bases(user_id=user_id)
        
        return KnowledgeBaseListResponse(
            knowledge_bases=[KnowledgeBaseResponse.from_orm(kb) for kb in knowledge_bases],
            total_count=len(knowledge_bases),
            page=1,
            page_size=len(knowledge_bases)
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_knowledge_base(
    kb_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        knowledge_base = service.get_knowledge_base(kb_id)
        
        if not knowledge_base:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        return KnowledgeBaseResponse.from_orm(knowledge_base)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseResponse)
async def update_knowledge_base(
    kb_id: int,
    kb_data: KnowledgeBaseUpdate,
    db: Session = Depends(get_db)
):
    """Update a knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        knowledge_base = service.update_knowledge_base(kb_id, **kb_data.dict(exclude_unset=True))
        
        if not knowledge_base:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        return KnowledgeBaseResponse.from_orm(knowledge_base)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/knowledge-bases/{kb_id}")
async def delete_knowledge_base(
    kb_id: int,
    db: Session = Depends(get_db)
):
    """Delete a knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        success = service.delete_knowledge_base(kb_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        return {"message": "Knowledge base deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



# File Upload and Processing Endpoints
@router.post("/knowledge-bases/{kb_id}/upload")
async def upload_files(
    kb_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Upload files to a knowledge base"""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        service = KnowledgeBaseService(db)
        uploaded_contents = await service.upload_files(kb_id, files)
        
        return {
            "message": f"Successfully uploaded {len(uploaded_contents)} files",
            "uploaded_files": [content.original_filename for content in uploaded_contents],
            "uploaded_contents": [
                {
                    "id": content.id,
                    "original_filename": content.original_filename,
                    "content_type": content.content_type,
                    "processing_status": content.processing_status
                }
                for content in uploaded_contents
            ],
            "processing_status": "pending"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/knowledge-bases/{kb_id}/text")
async def add_text_content(
    kb_id: int,
    text_data: dict,
    db: Session = Depends(get_db)
):
    """Add text-only content to a knowledge base"""
    try:
        print(f"Adding text content to KB {kb_id}")
        print(f"Text data: {text_data}")
        
        if not text_data.get('text'):
            raise HTTPException(status_code=400, detail="Text content is required")
        
        service = KnowledgeBaseService(db)
        content = await service.add_text_content(
            kb_id=kb_id,
            text=text_data['text'],
            title=text_data.get('title'),
            description=text_data.get('description')
        )
        
        result = {
            "message": "Text content added successfully",
            "id": content.id,
            "original_filename": content.original_filename,
            "content_type": content.content_type,
            "processing_status": content.processing_status
        }
        print(f"Text content added successfully: {result}")
        return result
        
    except Exception as e:
        print(f"API Error adding text content: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/knowledge-bases/{kb_id}/process")
async def process_uploaded_files(
    kb_id: int,
    provider_id: int = Form(1),
    model_id: int = Form(1),
    db: Session = Depends(get_db)
):
    """Process all pending files in a knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        
        # Get pending contents
        pending_contents = service.get_knowledge_base_contents(kb_id)
        pending_contents = [c for c in pending_contents if c.processing_status == 'pending']
        
        if not pending_contents:
            return {"message": "No pending files to process"}
        
        # Process each content
        results = []
        for content in pending_contents:
            try:
                success = await service.process_content(content.id, provider_id, model_id, None, 5000)
                results.append({
                    "content_id": content.id,
                    "filename": content.original_filename,
                    "status": "completed" if success else "failed"
                })
            except Exception as e:
                results.append({
                    "content_id": content.id,
                    "filename": content.original_filename,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "message": f"Processed {len(pending_contents)} files",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/knowledge-bases/{kb_id}/contents/{content_id}/process")
async def process_single_content(
    kb_id: int,
    content_id: int,
    process_data: dict,
    db: Session = Depends(get_db)
):
    """Process a single content item with optional custom summary"""
    try:
        print(f"Processing content {content_id} in KB {kb_id}")
        print(f"Process data: {process_data}")
        
        service = KnowledgeBaseService(db)
        
        provider_id = process_data.get('provider_id', 1)
        model_id = process_data.get('model_id', 1)
        custom_summary = process_data.get('custom_summary')
        summary = process_data.get('summary')
        max_summary_tokens = process_data.get('max_summary_tokens', 2000)
        
        # Validate token limit (cap at 10000 for safety)
        if max_summary_tokens > 10000:
            max_summary_tokens = 10000
        
        print(f"Provider ID: {provider_id}, Model ID: {model_id}")
        print(f"Custom summary: {custom_summary[:100] if custom_summary else 'None'}...")
        print(f"Max summary tokens: {max_summary_tokens}")
        
        # Use custom_summary if provided, otherwise use summary for backward compatibility
        final_summary = custom_summary if custom_summary is not None else summary
        
        success = await service.process_content(content_id, provider_id, model_id, final_summary, max_summary_tokens)
        
        if success:
            return {"message": "Content processed successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to process content")
        
    except Exception as e:
        print(f"API Error processing content {content_id}: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))

# Content Management Endpoints
@router.get("/knowledge-bases/{kb_id}/contents", response_model=KnowledgeBaseContentListResponse)
async def get_knowledge_base_contents(
    kb_id: int,
    content_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get contents of a knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        contents = service.get_knowledge_base_contents(kb_id, content_type)
        
        return KnowledgeBaseContentListResponse(
            contents=[KnowledgeBaseContentResponse.from_orm(content) for content in contents],
            total_count=len(contents),
            page=1,
            page_size=len(contents)
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/knowledge-bases/{kb_id}/contents/{content_id}", response_model=KnowledgeBaseContentResponse)
async def get_content(
    kb_id: int,
    content_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific content item"""
    try:
        service = KnowledgeBaseService(db)
        contents = service.get_knowledge_base_contents(kb_id)
        content = next((c for c in contents if c.id == content_id), None)
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        return KnowledgeBaseContentResponse.from_orm(content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/knowledge-bases/{kb_id}/contents/{content_id}")
async def delete_content(
    kb_id: int,
    content_id: int,
    db: Session = Depends(get_db)
):
    """Delete a content item from knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        success = service.delete_content(content_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Content not found")
        
        return {"message": "Content deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/knowledge-bases/contents/{content_id}/summary")
async def update_content_summary(
    content_id: int,
    summary_data: dict,
    db: Session = Depends(get_db)
):
    """Update content summary"""
    try:
        if not summary_data.get('summary'):
            raise HTTPException(status_code=400, detail="Summary is required")
        
        service = KnowledgeBaseService(db)
        success = await service.update_content_summary(content_id, summary_data['summary'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Content not found")
        
        return {"message": "Summary updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Search Endpoints
@router.post("/knowledge-bases/{kb_id}/search", response_model=KnowledgeBaseSearchResponse)
async def search_knowledge_base(
    kb_id: int,
    search_request: KnowledgeBaseSearchRequest,
    db: Session = Depends(get_db)
):
    """Search a knowledge base"""
    try:
        service = KnowledgeBaseService(db)
        results = await service.search_knowledge_base(
            kb_id=kb_id,
            query=search_request.query,
            n_results=search_request.limit
        )
        
        return KnowledgeBaseSearchResponse(
            query=search_request.query,
            results=results.get('results', []),
            total_results=results.get('total_results', 0),
            search_time_ms=0.0  # TODO: Add actual timing
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Status Endpoints
@router.get("/knowledge-bases/{kb_id}/contents/{content_id}/status", response_model=ProcessingStatusResponse)
async def get_processing_status(
    kb_id: int,
    content_id: int,
    db: Session = Depends(get_db)
):
    """Get processing status of a content item"""
    try:
        service = KnowledgeBaseService(db)
        contents = service.get_knowledge_base_contents(kb_id)
        content = next((c for c in contents if c.id == content_id), None)
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        return ProcessingStatusResponse(
            content_id=content.id,
            status=content.processing_status,
            error=content.processing_error
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
