# backend/app/schemas/provider_schemas.py
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class ProviderCreate(BaseModel):
    name: str
    api_key: str
    
    @validator('name')
    def validate_name(cls, v):
        allowed_providers = ['openai', 'groq']
        if v.lower() not in allowed_providers:
            raise ValueError(f'Provider must be one of: {allowed_providers}')
        return v.lower()

class ApiKeyUpdate(BaseModel):
    api_key: str
    
    @validator('api_key')
    def validate_api_key(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('API key cannot be empty')
        return v.strip()

class ProviderResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ModelResponse(BaseModel):
    id: int
    provider_id: int
    name: str
    description: Optional[str]
    context_length: Optional[int]
    is_available: bool
    supports_vision: bool
    
    class Config:
        from_attributes = True

# Prompt schemas
class PromptCreate(BaseModel):
    provider_id: int
    model_id: int
    title: Optional[str] = "Untitled Prompt"
    text: str
    system_prompt: Optional[str] = None
    user_id: Optional[str] = "default_user"

class PromptResponse(BaseModel):
    id: int
    uuid: str
    user_id: str
    provider_id: int
    model_id: int
    title: Optional[str]
    text: str
    system_prompt: Optional[str]
    last_output: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    
    @validator('last_output', pre=True)
    def validate_last_output(cls, v):
        if v is None or v == 'null' or v == '':
            return None
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v
    
    class Config:
        from_attributes = True

# New schemas for export/import/sharing
class PromptExport(BaseModel):
    """Schema for exporting prompts"""
    id: int
    uuid: str
    title: str
    text: str
    system_prompt: Optional[str]
    provider_name: str
    model_name: str
    tags: List[str] = []
    description: Optional[str]
    category: Optional[str]
    difficulty: Optional[str]  # beginner, intermediate, advanced
    use_cases: List[str] = []
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True

class PromptImport(BaseModel):
    """Schema for importing prompts"""
    title: str
    text: str
    system_prompt: Optional[str]
    provider_name: Optional[str]  # If not specified, use default
    model_name: Optional[str]     # If not specified, use default
    tags: List[str] = []
    description: Optional[str]
    category: Optional[str]
    difficulty: Optional[str]
    use_cases: List[str] = []
    metadata: Dict[str, Any] = {}

class PromptShare(BaseModel):
    """Schema for sharing prompts"""
    prompt_id: int
    is_public: bool = False
    allow_copying: bool = True
    require_attribution: bool = False
    license: Optional[str] = "MIT"
    share_notes: Optional[str]

class PromptTemplate(BaseModel):
    """Standardized prompt template format"""
    name: str
    version: str = "1.0.0"
    description: str
    author: str
    prompt_template: str
    system_prompt: Optional[str]
    variables: List[Dict[str, str]] = []  # [{"name": "variable", "description": "what it does"}]
    examples: List[Dict[str, str]] = []
    tags: List[str] = []
    category: str
    difficulty: str
    use_cases: List[str] = []
    requirements: List[str] = []
    license: str = "MIT"
    created_at: datetime
    updated_at: datetime


class PromptRun(BaseModel):
    prompt_id: Optional[int] = None  # If None, creates new prompt
    provider_id: int
    model_id: int
    text: str
    title: Optional[str] = None
    system_prompt: Optional[str] = None




class OutputResponse(BaseModel):
    id: int
    prompt_id: int
    output_text: str
    latency_ms: Optional[float]
    token_usage: Optional[Dict[str, Any]]
    cost_usd: Optional[float]
    response_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True