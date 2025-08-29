# backend/app/api/providers.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.database.models import Provider, Model, Prompt
from app.schemas.provider_schemas import (
    ProviderCreate, ProviderResponse, ModelResponse, ApiKeyUpdate
)
from app.services.provider_service import ProviderService

router = APIRouter()

@router.post("/providers", status_code=status.HTTP_201_CREATED)
async def add_provider(
    provider_data: ProviderCreate,
    db: Session = Depends(get_db)
):
    """
    Add/Update API key for a fixed provider (OpenAI or Groq).
    
    This endpoint validates the API key and automatically fetches available models.
    """
    try:
        print(f"Adding provider: {provider_data.name}")
        print(f"API key length: {len(provider_data.api_key)}")
        print(f"API key starts with: {provider_data.api_key[:10]}...")
        
        service = ProviderService(db)
        provider = await service.add_provider(
            name=provider_data.name.lower(), 
            api_key=provider_data.api_key
        )
        
        # Get the refreshed models for this provider
        models = db.query(Model).filter(
            Model.provider_id == provider.id,
            Model.is_available == True
        ).all()
        
        # Create response with provider and model count info
        response = ProviderResponse.from_orm(provider)
        response_dict = response.dict()
        response_dict["models_refreshed"] = len(models)
        response_dict["message"] = f"Provider added successfully with {len(models)} models refreshed"
        
        return response_dict
    except ValueError as e:
        print(f"ValueError in add_provider: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Exception in add_provider: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to add provider: {str(e)}")

@router.put("/providers/{provider_name}/api-key")
async def update_provider_api_key(
    provider_name: str,
    api_key_data: ApiKeyUpdate,
    db: Session = Depends(get_db)
):
    """
    Update API key for an existing provider.
    
    This endpoint validates the new API key and automatically refreshes available models.
    """
    try:
        service = ProviderService(db)
        provider = await service.update_api_key(
            provider_name=provider_name.lower(),
            api_key=api_key_data.api_key
        )
        
        # Get the refreshed models for this provider
        models = db.query(Model).filter(
            Model.provider_id == provider.id,
            Model.is_available == True
        ).all()
        
        return {
            "message": f"API key updated successfully for {provider_name} with {len(models)} models refreshed",
            "provider": ProviderResponse.from_orm(provider),
            "models_refreshed": len(models)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update API key: {str(e)}")

@router.get("/providers", response_model=List[ProviderResponse])
def get_providers(db: Session = Depends(get_db)):
    """
    Get all configured providers.
    
    Returns list of providers with their status and basic info.
    API keys are not returned for security.
    """
    providers = db.query(Provider).filter(Provider.is_active == True).all()
    return [ProviderResponse.from_orm(provider) for provider in providers]

@router.get("/providers/status")
def get_providers_status(db: Session = Depends(get_db)):
    """
    Get status of all fixed providers (OpenAI and Groq).
    
    Returns detailed information about each provider including configuration status.
    """
    service = ProviderService(db)
    return service.get_all_providers_status()

@router.get("/providers/available")
def get_available_providers(db: Session = Depends(get_db)):
    """
    Get information about available providers that can be configured.
    
    Returns provider information including available models.
    """
    service = ProviderService(db)
    available_providers = []
    
    for provider_name in service.get_available_providers():
        provider_info = service.get_provider_info(provider_name)
        # Check if provider is already configured
        existing_provider = db.query(Provider).filter(
            Provider.name == provider_name,
            Provider.is_active == True
        ).first()
        
        provider_info["configured"] = existing_provider is not None
        if existing_provider:
            provider_info["provider_id"] = existing_provider.id
        
        available_providers.append(provider_info)
    
    return available_providers

@router.get("/models", response_model=List[ModelResponse])
def get_models(
    provider: str = None,
    db: Session = Depends(get_db)
):
    """
    Get available models, optionally filtered by provider.
    
    - **provider**: Filter models by provider name (openai, groq)
    """
    query = db.query(Model).join(Provider).filter(
        Provider.is_active == True,
        Model.is_available == True
    )
    
    if provider:
        query = query.filter(Provider.name == provider.lower())
    
    models = query.all()
    return [ModelResponse.from_orm(model) for model in models]

@router.put("/providers/{provider_id}/refresh-models")
async def refresh_provider_models(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """
    Refresh available models for a specific provider.
    
    Fetches latest models from the provider's API and updates the database.
    """
    try:
        service = ProviderService(db)
        models = await service.refresh_models(provider_id)
        return {
            "message": f"Refreshed {len(models)} models",
            "models": [ModelResponse.from_orm(model) for model in models]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh models: {str(e)}")

@router.delete("/providers/{provider_id}")
def delete_provider(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove API key and deactivate a provider.
    
    This will deactivate the provider and clear the API key, but keep the provider record.
    Associated models will be deactivated but not deleted to preserve data integrity.
    """
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    try:
        # Deactivate provider and clear API key
        provider.is_active = False
        provider.api_key = ""
        
        # Deactivate associated models instead of deleting them
        models = db.query(Model).filter(Model.provider_id == provider_id).all()
        for model in models:
            model.is_available = False
        
        db.commit()
        
        return {
            "message": f"Provider {provider.name} deactivated successfully",
            "models_deactivated": len(models)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to deactivate provider: {str(e)}")

@router.delete("/providers/{provider_id}/api-key")
def clear_provider_api_key(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """
    Clear the API key for a provider without deactivating it.
    
    This allows users to remove their API key while keeping the provider configured.
    """
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    try:
        # Clear API key but keep provider active
        provider.api_key = ""
        db.commit()
        
        return {
            "message": f"API key cleared for {provider.name}",
            "provider": ProviderResponse.from_orm(provider)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear API key: {str(e)}")

@router.delete("/providers/{provider_id}/permanent")
def permanently_delete_provider(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """
    Permanently delete a provider and all associated data.
    
    WARNING: This will delete all prompts, outputs, and evaluations associated with this provider.
    Use with caution.
    """
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    try:
        # Get counts for confirmation
        prompt_count = db.query(Prompt).filter(Prompt.provider_id == provider_id).count()
        model_count = db.query(Model).filter(Model.provider_id == provider_id).count()
        
        # Delete the provider (this will cascade delete models, prompts, outputs, evaluations)
        db.delete(provider)
        db.commit()
        
        return {
            "message": f"Provider {provider.name} permanently deleted",
            "deleted_data": {
                "provider": 1,
                "models": model_count,
                "prompts": prompt_count
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete provider: {str(e)}")

