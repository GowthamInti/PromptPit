# backend/app/schemas/judge_schemas.py
from pydantic import BaseModel, validator
from typing import Optional, Dict, Any
from datetime import datetime

class JudgeRequest(BaseModel):
    output_id: int
    judge_provider_id: Optional[int] = None
    judge_model_id: Optional[int] = None
    criteria: Dict[str, str]  # {"clarity": "How clear is the response?", "accuracy": "How accurate is the information?"}
    scale: Optional[int] = 10  # 1-10 scale by default
    explanation_required: Optional[bool] = True
    
    @validator('scale')
    def validate_scale(cls, v):
        if v is not None and (v < 1 or v > 20):
            raise ValueError('Scale must be between 1 and 20')
        return v
    
    @validator('criteria')
    def validate_criteria(cls, v):
        if not v:
            raise ValueError('At least one evaluation criterion must be provided')
        return v

class JudgeResponse(BaseModel):
    score: float
    feedback: str
    evaluation_id: int
    latency_ms: Optional[float] = None

class EvaluationResponse(BaseModel):
    id: int
    output_id: int
    judge_provider_id: Optional[int]
    judge_model_id: Optional[int]
    judge_prompt: str
    score: Optional[float]
    feedback: Optional[str]
    criteria: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True