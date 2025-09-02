# backend/app/services/groq_service.py
from typing import List, Dict
from groq import AsyncGroq
from sqlalchemy.orm import Session
from app.database.models import Provider, Model
import time

class GroqService:
    def __init__(self, db: Session):
        self.db = db
        self.provider_name = "groq"

    async def add_provider(self, api_key: str) -> Provider:
        """Add Groq provider with API key validation"""
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
        """Update API key for existing Groq provider"""
        await self._validate_api_key(api_key)
        
        provider = self.db.query(Provider).filter(Provider.name == self.provider_name).first()
        if not provider:
            raise ValueError("Groq provider not found")
        
        provider.api_key = api_key
        provider.is_active = True
        self.db.commit()
        self.db.refresh(provider)
        
        # Refresh models with new API key
        await self.refresh_models(provider.id)
        return provider

    async def refresh_models(self, provider_id: int) -> List[Model]:
        """Fetch and update available Groq models"""
        provider = self.db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider or provider.name != self.provider_name:
            raise ValueError("Groq provider not found")

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
        """Execute a prompt using Groq API"""
        provider = self.db.query(Provider).filter(Provider.id == prompt_data["provider_id"]).first()
        if not provider or not provider.is_active or provider.name != self.provider_name:
            raise ValueError("Groq provider not found or inactive")

        start_time = time.time()
        result = await self._run_prompt(provider.api_key, prompt_data)
        result["latency_ms"] = (time.time() - start_time) * 1000
        return result

    async def _validate_api_key(self, api_key: str):
        """Validate Groq API key"""
        try:
            client = AsyncGroq(api_key=api_key)
            await client.models.list()
        except Exception as e:
            raise ValueError(f"Invalid Groq API key: {str(e)}")

    async def _fetch_models(self, api_key: str) -> List[Dict]:
        """Fetch available models from Groq API"""
        client = AsyncGroq(api_key=api_key)
        models = await client.models.list()

        # Vision-capable models from Groq documentation
        vision_models = {
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "meta-llama/llama-4-maverick-17b-128e-instruct"
        }

        model_list = []
        for model in models.data:
            is_vision_capable = model.id in vision_models
            model_list.append({
                "name": model.id,
                "description": f"Groq {model.id}",
                "context_length": getattr(model, "context_window", 4096),
                "supports_vision": is_vision_capable
            })
        return model_list

    async def _run_prompt(self, api_key: str, prompt_data: Dict) -> Dict:
        """Execute prompt using Groq API"""
        client = AsyncGroq(api_key=api_key)

        messages = []
        if prompt_data.get("system_prompt"):
            messages.append({"role": "system", "content": prompt_data["system_prompt"]})
        
        # File content is now already integrated into the text
        user_content = prompt_data["text"]
        
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
            response_format=prompt_data.get("response_format")
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
                "finish_reason": response.choices[0].finish_reason,
                "response_format": prompt_data.get("response_format")
            }
        }

    def get_available_models(self) -> List[str]:
        """Get list of available Groq models from database"""
        # Return models from database instead of hardcoded list
        provider = self.db.query(Provider).filter(Provider.name == self.provider_name).first()
        if not provider:
            return []
        
        models = self.db.query(Model).filter(Model.provider_id == provider.id).all()
        return [model.name for model in models]

    def get_model_context_length(self, model_name: str) -> int:
        """Get context length for Groq models from database"""
        provider = self.db.query(Provider).filter(Provider.name == self.provider_name).first()
        if not provider:
            return 4096
        
        model = self.db.query(Model).filter(
            Model.name == model_name,
            Model.provider_id == provider.id
        ).first()
        return model.context_length if model else 4096
