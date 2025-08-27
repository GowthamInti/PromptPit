# backend/app/services/openai_service.py
from typing import List, Dict
import openai
from sqlalchemy.orm import Session
from app.database.models import Provider, Model
import time

class OpenAIService:
    def __init__(self, db: Session):
        self.db = db
        self.provider_name = "openai"

    async def add_provider(self, api_key: str) -> Provider:
        """Add OpenAI provider with API key validation"""
        await self._validate_api_key(api_key)

        existing = self.db.query(Provider).filter(Provider.name == self.provider_name).first()
        if existing:
            existing.api_key = api_key
            existing.is_active = True
            self.db.commit()
            return existing

        provider = Provider(name=self.provider_name, api_key=api_key)
        self.db.add(provider)
        self.db.commit()
        self.db.refresh(provider)
        await self.refresh_models(provider.id)
        return provider

    async def update_api_key(self, api_key: str) -> Provider:
        """Update API key for existing OpenAI provider"""
        await self._validate_api_key(api_key)
        
        provider = self.db.query(Provider).filter(Provider.name == self.provider_name).first()
        if not provider:
            raise ValueError("OpenAI provider not found")
        
        provider.api_key = api_key
        provider.is_active = True
        self.db.commit()
        self.db.refresh(provider)
        
        # Refresh models with new API key
        await self.refresh_models(provider.id)
        return provider

    async def refresh_models(self, provider_id: int) -> List[Model]:
        """Fetch and update available OpenAI models"""
        provider = self.db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider or provider.name != self.provider_name:
            raise ValueError("OpenAI provider not found")

        models_data = await self._fetch_models(provider.api_key)

        for model_data in models_data:
            existing_model = self.db.query(Model).filter(
                Model.provider_id == provider_id,
                Model.name == model_data["name"]
            ).first()

            if existing_model:
                existing_model.description = model_data["description"]
                existing_model.context_length = model_data["context_length"]
                existing_model.supports_vision = model_data["supports_vision"]
                existing_model.is_available = True
            else:
                new_model = Model(
                    provider_id=provider_id,
                    name=model_data["name"],
                    description=model_data["description"],
                    context_length=model_data["context_length"],
                    supports_vision=model_data["supports_vision"]
                )
                self.db.add(new_model)

        self.db.commit()
        return self.db.query(Model).filter(Model.provider_id == provider_id).all()

    async def run_prompt(self, prompt_data: Dict) -> Dict:
        """Execute a prompt using OpenAI API"""
        provider = self.db.query(Provider).filter(Provider.id == prompt_data["provider_id"]).first()
        if not provider or not provider.is_active or provider.name != self.provider_name:
            raise ValueError("OpenAI provider not found or inactive")

        start_time = time.time()
        result = await self._run_prompt(provider.api_key, prompt_data)
        result["latency_ms"] = (time.time() - start_time) * 1000
        return result

    async def _validate_api_key(self, api_key: str):
        """Validate OpenAI API key"""
        try:
            client = openai.AsyncOpenAI(api_key=api_key)
            await client.models.list()
        except Exception as e:
            raise ValueError(f"Invalid OpenAI API key: {str(e)}")

    async def _fetch_models(self, api_key: str) -> List[Dict]:
        """Fetch available models from OpenAI API"""
        client = openai.AsyncOpenAI(api_key=api_key)
        models = await client.models.list()

        # Vision-capable models from OpenAI
        vision_models = {
            "gpt-4-vision-preview",
            "gpt-4o",
            "gpt-4o-mini"
        }

        model_list = []
        for model in models.data:
            if model.id.startswith(("gpt-", "text-", "davinci")):
                is_vision_capable = model.id in vision_models
                model_list.append({
                    "name": model.id,
                    "description": f"OpenAI {model.id}",
                    "context_length": self._get_context_length(model.id),
                    "supports_vision": is_vision_capable
                })
        return model_list

    async def _run_prompt(self, api_key: str, prompt_data: Dict) -> Dict:
        """Execute prompt using OpenAI API"""
        client = openai.AsyncOpenAI(api_key=api_key)

        messages = []
        if prompt_data.get("system_prompt"):
            messages.append({"role": "system", "content": prompt_data["system_prompt"]})
        
        # Handle file content if provided
        user_content = prompt_data["text"]
        if prompt_data.get("file_content"):
            file_content = prompt_data["file_content"]
            file_content_prefix = prompt_data.get("file_content_prefix", "File content:\n")
            user_content = f"{file_content_prefix}{file_content}\n\nUser prompt: {user_content}"
        
        # Handle image contents if provided (for visual question answering)
        if prompt_data.get("image_contents"):
            # Create content array with text and images
            content = []
            
            # Add text content
            if user_content:
                content.append({"type": "text", "text": user_content})
            
            # Add image contents
            content.extend(prompt_data["image_contents"])
            
            messages.append({"role": "user", "content": content})
        else:
            # Regular text-only message
            messages.append({"role": "user", "content": user_content})

        response = await client.chat.completions.create(
            model=prompt_data["model_name"],
            messages=messages,
            temperature=prompt_data.get("temperature", 0.7),
            max_tokens=prompt_data.get("max_tokens", 1000)
        )

        return {
            "output_text": response.choices[0].message.content,
            "token_usage": {
                "input": response.usage.prompt_tokens,
                "output": response.usage.completion_tokens,
                "total": response.usage.total_tokens
            },
            "response_metadata": {
                "model": response.model,
                "finish_reason": response.choices[0].finish_reason
            }
        }

    def _get_context_length(self, model_name: str) -> int:
        """Get context length for OpenAI models"""
        context_lengths = {
            "gpt-4": 8192,
            "gpt-4-32k": 32768,
            "gpt-4-turbo": 128000,
            "gpt-4-turbo-preview": 128000,
            "gpt-3.5-turbo": 4096,
            "gpt-3.5-turbo-16k": 16384,
            "gpt-3.5-turbo-instruct": 4096,
        }
        return context_lengths.get(model_name, 4096)

    def get_available_models(self) -> List[str]:
        """Get list of available OpenAI models from database"""
        # Return models from database instead of hardcoded list
        provider = self.db.query(Provider).filter(Provider.name == self.provider_name).first()
        if not provider:
            return []
        
        models = self.db.query(Model).filter(Model.provider_id == provider.id).all()
        return [model.name for model in models]
