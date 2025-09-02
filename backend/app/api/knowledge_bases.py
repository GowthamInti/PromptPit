# backend/app/api/knowledge_bases.py
from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import asyncio
import json

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
        print(f"Received knowledge base data: {kb_data}")
        print(f"Name: {kb_data.name}")
        print(f"Description: {kb_data.description}")
        print(f"User ID: {kb_data.user_id}")
        
        service = KnowledgeBaseService(db)
        knowledge_base = service.create_knowledge_base(
            name=kb_data.name,
            description=kb_data.description,
            user_id=kb_data.user_id
        )
        
        return KnowledgeBaseResponse.from_orm(knowledge_base)
        
    except Exception as e:
        print(f"Error creating knowledge base: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
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
@router.post("/knowledge-bases/{kb_id}/add-content")
async def add_content_with_summary(
    kb_id: int,
    summary: str = Form(...),  # Summary is required since it's the processed content
    provider_id: int = Form(1),
    model_id: int = Form(1),
    db: Session = Depends(get_db)
):
    """Add content directly to knowledge base with pre-generated summary"""
    try:
        print(f"Adding content to knowledge base {kb_id}")
        print(f"Summary: {summary}")
        print(f"Summary type: {type(summary)}")
        print(f"Summary length: {len(summary) if summary else 'None'}")
        print(f"Provider ID: {provider_id}")
        print(f"Model ID: {model_id}")
        
        # Validate required fields
        if not summary or not summary.strip():
            raise HTTPException(status_code=400, detail="Summary is required and cannot be empty")
        
        service = KnowledgeBaseService(db)
        
        # Add content directly to ChromaDB (no files/images needed)
        content = await service.add_unified_content(
            kb_id=kb_id,
            summary=summary,
            provider_id=provider_id,
            model_id=model_id,
        )
        
        print(f"Content added successfully: {content}")
        
        return {
            "message": f"Successfully added processed content to knowledge base",
            "added_content": {
                "id": content['id'],
                "original_filename": content['original_filename'],
                "content_type": content['content_type'],
                "processing_status": content['processing_status']
            }
        }
        
    except Exception as e:
        print(f"Error adding content: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))



# Content Management Endpoints

@router.get("/knowledge-bases/{kb_id}/contents/chroma")
async def get_knowledge_base_contents_from_chroma(
    kb_id: int,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get contents of a knowledge base directly from ChromaDB"""
    try:
        service = KnowledgeBaseService(db)
        result = service.get_knowledge_base_contents_from_chroma(kb_id, limit, offset)
        
        return {
            "message": "Contents retrieved from ChromaDB",
            "source": result['source'],
            "collection_name": result['collection_name'],
            "contents": result['contents'],
            "total_count": result['total_count'],
            "returned_count": result['returned_count']
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/knowledge-bases/{kb_id}/contents/{content_id}/chroma")
async def get_content_from_chroma(
    kb_id: int,
    content_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific content item directly from ChromaDB"""
    try:
        service = KnowledgeBaseService(db)
        content = service.get_content_from_chroma(kb_id, content_id)
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found in ChromaDB")
        
        return {
            "message": "Content retrieved from ChromaDB",
            "source": "chromadb",
            "content": content
        }
        
    except HTTPException:
        raise
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
    content_id: str,
    db: Session = Depends(get_db)
):
    """Delete a content item directly from ChromaDB"""
    try:
        service = KnowledgeBaseService(db)
        success = service.delete_content(content_id, kb_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Content not found")
        
        return {"message": "Content deleted from ChromaDB successfully"}
        
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
