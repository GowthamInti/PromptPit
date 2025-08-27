# backend/app/schemas/experiment_schemas.py
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class OptimizationCycleCreate(BaseModel):
    iteration: int
    score: Optional[float] = None
    prompt_changes: Optional[str] = None
    prompt_id: Optional[int] = None
    output_id: Optional[int] = None

class OptimizationCycleResponse(BaseModel):
    id: int
    experiment_id: int
    iteration: int
    score: Optional[float]
    prompt_changes: Optional[str]
    prompt_id: Optional[int]
    output_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str  # 'report_generation', 'content_creation', etc.
    target_score: Optional[float] = None
    max_iterations: Optional[int] = 5
    dataset_size: Optional[int] = 0
    report_type: Optional[str] = None
    user_id: Optional[str] = "default_user"
    
    @validator('type')
    def validate_type(cls, v):
        allowed_types = ['report_generation', 'content_creation', 'translation', 'summarization', 'qa']
        if v not in allowed_types:
            raise ValueError(f'Type must be one of: {allowed_types}')
        return v
    
    @validator('target_score')
    def validate_target_score(cls, v):
        if v is not None and (v < 0 or v > 10):
            raise ValueError('Target score must be between 0 and 10')
        return v
    
    @validator('max_iterations')
    def validate_max_iterations(cls, v):
        if v is not None and (v < 1 or v > 20):
            raise ValueError('Max iterations must be between 1 and 20')
        return v

class ExperimentResponse(BaseModel):
    id: int
    uuid: str
    user_id: str
    name: str
    description: Optional[str]
    type: str
    status: str
    progress: float
    target_score: Optional[float]
    current_score: float
    iterations: int
    max_iterations: int
    dataset_size: int
    report_type: Optional[str]
    created_at: datetime
    updated_at: datetime
    optimization_cycles: List[OptimizationCycleResponse] = []
    
    class Config:
        from_attributes = True

class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    current_score: Optional[float] = None
    iterations: Optional[int] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ['pending', 'running', 'completed', 'failed']
            if v not in allowed_statuses:
                raise ValueError(f'Status must be one of: {allowed_statuses}')
        return v
    
    @validator('progress')
    def validate_progress(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Progress must be between 0 and 100')
        return v
