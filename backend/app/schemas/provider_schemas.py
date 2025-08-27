# backend/app/schemas/provider_schemas.py
from pydantic import BaseModel, validator
from typing import Optional, List
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


# backend/app/schemas/prompt_schemas.py
from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class PromptCreate(BaseModel):
    provider_id: int
    model_id: int
    title: Optional[str] = "Untitled Prompt"
    text: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    user_id: Optional[str] = "default_user"
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if v is not None and (v < 0 or v > 2):
            raise ValueError('Temperature must be between 0 and 2')
        return v
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v is not None and (v < 1 or v > 4000):
            raise ValueError('Max tokens must be between 1 and 4000')
        return v

class PromptResponse(BaseModel):
    id: int
    uuid: str
    user_id: str
    provider_id: int
    model_id: int
    title: Optional[str]
    text: str
    system_prompt: Optional[str]
    temperature: float
    max_tokens: int
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
        # Add this to handle potential serialization issues
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class PromptRun(BaseModel):
    prompt_id: Optional[int] = None  # If None, creates new prompt
    provider_id: int
    model_id: int
    text: str
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000



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