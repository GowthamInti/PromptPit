# backend/app/schemas/model_card_schemas.py
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class ModelCardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "draft"
    experiment_ids: Optional[List[int]] = []
    user_id: Optional[str] = "default_user"
    
    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = ['draft', 'published', 'archived']
        if v not in allowed_statuses:
            raise ValueError(f'Status must be one of: {allowed_statuses}')
        return v

class ModelCardResponse(BaseModel):
    id: int
    uuid: str
    user_id: str
    title: str
    description: Optional[str]
    status: str
    metrics: Optional[Dict[str, Any]]
    models_tested: Optional[List[str]]
    providers: Optional[List[str]]
    experiment_ids: Optional[List[int]]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ModelCardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    models_tested: Optional[List[str]] = None
    providers: Optional[List[str]] = None
    experiment_ids: Optional[List[int]] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ['draft', 'published', 'archived']
            if v not in allowed_statuses:
                raise ValueError(f'Status must be one of: {allowed_statuses}')
        return v

class ModelCardGenerate(BaseModel):
    title: str
    description: Optional[str] = None
    experiment_ids: List[int]
    user_id: Optional[str] = "default_user"
