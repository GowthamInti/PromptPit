# backend/app/services/provider_service.py
from typing import List, Dict
from sqlalchemy.orm import Session
from app.database.models import Provider, Model
from app.services.openai_service import OpenAIService
from app.services.groq_service import GroqService
from app.services.file_extraction_service import FileExtractionService

class ProviderService:
    def __init__(self, db: Session):
        self.db = db
        self.openai_service = OpenAIService(db)
        self.groq_service = GroqService(db)
        self.file_extraction_service = FileExtractionService()
        self._ensure_fixed_providers()

    def _ensure_fixed_providers(self):
        """Ensure that OpenAI and Groq providers exist in the database"""
        providers = ["openai", "groq"]
        
        for provider_name in providers:
            existing = self.db.query(Provider).filter(Provider.name == provider_name).first()
            if not existing:
                provider = Provider(name=provider_name, api_key="", is_active=False)
                self.db.add(provider)
        
        self.db.commit()

    async def add_provider(self, name: str, api_key: str) -> Provider:
        """Add/Update API key for a fixed provider and refresh models"""
        if name == "openai":
            provider = await self.openai_service.add_provider(api_key)
        elif name == "groq":
            provider = await self.groq_service.add_provider(api_key)
        else:
            raise ValueError(f"Unsupported provider: {name}")
        
        # Automatically refresh models after adding provider
        try:
            await self.refresh_models(provider.id)
        except Exception as e:
            print(f"Warning: Failed to refresh models for {name}: {str(e)}")
            # Don't fail the entire operation if model refresh fails
        
        return provider

    async def update_api_key(self, provider_name: str, api_key: str) -> Provider:
        """Update API key for an existing provider and refresh models"""
        if provider_name == "openai":
            provider = await self.openai_service.update_api_key(api_key)
        elif provider_name == "groq":
            provider = await self.groq_service.update_api_key(api_key)
        else:
            raise ValueError(f"Unsupported provider: {provider_name}")
        
        # Automatically refresh models after updating API key
        try:
            await self.refresh_models(provider.id)
        except Exception as e:
            print(f"Warning: Failed to refresh models for {provider_name}: {str(e)}")
            # Don't fail the entire operation if model refresh fails
        
        return provider

    async def refresh_models(self, provider_id: int) -> List[Model]:
        """Refresh models for a specific provider"""
        provider = self.db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            raise ValueError("Provider not found")

        if provider.name == "openai":
            return await self.openai_service.refresh_models(provider_id)
        elif provider.name == "groq":
            return await self.groq_service.refresh_models(provider_id)
        else:
            raise ValueError(f"Unsupported provider: {provider.name}")

    async def run_prompt(self, prompt_data: Dict) -> Dict:
        """Run a prompt using the appropriate provider service"""
        provider = self.db.query(Provider).filter(Provider.id == prompt_data["provider_id"]).first()
        if not provider or not provider.is_active:
            raise ValueError("Provider not found or inactive")

        # Handle file extraction if files are present
        if prompt_data.get("files") and prompt_data.get("include_file_content", True):
            try:
                extracted_contents = await self.file_extraction_service.extract_text_from_files(prompt_data["files"])
                file_content = "\n\n".join([content for content in extracted_contents 
                                        if not content.startswith("Error processing") 
                                        and not content.startswith("Unsupported file type")])
                
                if file_content:
                    # Integrate file content directly into the text with prefix
                    file_content_prefix = prompt_data.get("file_content_prefix", "Content extracted from documents:\n")
                    original_text = prompt_data["text"]
                    prompt_data["text"] = f"{file_content_prefix}{file_content}\n\nUser prompt: {original_text}"
                    
                    # Remove the separate file_content key since it's now integrated
                    prompt_data.pop("file_content", None)
                    prompt_data.pop("file_content_prefix", None)
                    
            except Exception as e:
                # Log error but continue without file content
                print(f"Error extracting file content: {str(e)}")

        # Handle image contents if present
        if prompt_data.get("image_contents"):
            # Check if the selected model supports vision
            model = self.db.query(Model).filter(Model.id == prompt_data.get("model_id")).first()
            if model and not model.supports_vision:
                raise ValueError(f"Model '{model.name}' does not support vision. Please select a vision-capable model like GPT-4 Vision or Llama 4 Scout.")
        
        # Handle structured output if enabled
        if prompt_data.get("structured_output") and prompt_data.get("json_schema"):
            try:
                # Parse the JSON schema to validate it
                import json
                schema = json.loads(prompt_data["json_schema"])
                
                # Basic schema validation
                if not isinstance(schema, dict):
                    raise ValueError("Schema must be a JSON object")
                
                # Check if the model supports structured output
                model = self.db.query(Model).filter(Model.id == prompt_data.get("model_id")).first()
                if model:
                    # For now, assume all models support structured output
                    # In the future, we could add a supports_structured_output field to the Model table
                    print(f"Using structured output with model: {model.name}")
                
                # Add structured output configuration to prompt_data for provider services
                prompt_data["response_format"] = {
                                                "type": "json_schema",
                                                "json_schema": {
                                                    "name": "Report",
                                                    "schema": schema
                                                }
                                            }

                
                # Also add a note to the prompt text to inform the user
                structured_note = "\n\nPlease provide your response in the exact JSON format specified by the schema."
                prompt_data["text"] = prompt_data["text"] + structured_note
                
                print(f"Structured output enabled with schema: {json.dumps(schema, indent=2)}")
                
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Warning: Invalid JSON schema provided for structured output: {prompt_data['json_schema']}")
                print(f"Error: {str(e)}")
                # Continue without structured output if schema is invalid
                prompt_data["structured_output"] = False
                prompt_data.pop("response_format", None)
        
        if provider.name == "openai":
            return await self.openai_service.run_prompt(prompt_data)
        elif provider.name == "groq":
            return await self.groq_service.run_prompt(prompt_data)
        else:
            raise ValueError(f"Unsupported provider: {provider.name}")

    def get_provider_service(self, provider_name: str):
        """Get the appropriate service for a provider"""
        if provider_name == "openai":
            return self.openai_service
        elif provider_name == "groq":
            return self.groq_service
        else:
            raise ValueError(f"Unsupported provider: {provider_name}")

    def get_available_providers(self) -> List[str]:
        """Get list of available providers"""
        return ["openai", "groq"]

    def get_provider_info(self, provider_name: str) -> Dict:
        """Get information about a specific provider"""
        if provider_name == "openai":
            return {
                "name": "openai",
                "display_name": "OpenAI",
                "description": "GPT-4, GPT-3.5-turbo, and more",
                "models": self.openai_service.get_available_models()
            }
        elif provider_name == "groq":
            return {
                "name": "groq", 
                "display_name": "Groq",
                "description": "Llama2, Mixtral, and other open-source models",
                "models": self.groq_service.get_available_models()
            }
        else:
            raise ValueError(f"Unsupported provider: {provider_name}")

    def get_all_providers_status(self) -> List[Dict]:
        """Get status of all fixed providers"""
        providers = self.db.query(Provider).filter(Provider.name.in_(["openai", "groq"])).all()
        provider_map = {p.name: p for p in providers}
        
        result = []
        for provider_name in ["openai", "groq"]:
            provider = provider_map.get(provider_name)
            provider_info = self.get_provider_info(provider_name)
            
            status = {
                "name": provider_name,
                "display_name": provider_info["display_name"],
                "description": provider_info["description"],
                "models": provider_info["models"],
                "configured": provider and provider.is_active and provider.api_key != "",
                "has_api_key": provider and provider.api_key != "",
                "is_active": provider and provider.is_active,
                "provider_id": provider.id if provider else None
            }
            
            result.append(status)
        
        return result
