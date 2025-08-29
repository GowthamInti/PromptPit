# backend/app/api/prompts.py
import io
import base64
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from PIL import Image
from app.database.connection import get_db
from app.database.models import Prompt, Output, Provider, Model, PromptVersion
from app.schemas.provider_schemas import (
    PromptCreate, PromptResponse, PromptRun, OutputResponse
)
from app.services.provider_service import ProviderService
from app.services.file_extraction_service import FileExtractionService
import time

# Image processing functions
async def process_image(image_file: UploadFile) -> str:
    """Process image file and return base64 encoded string"""
    try:
        # Read image content
        image_content = await image_file.read()
        image = Image.open(io.BytesIO(image_content))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        # Save to bytes
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/jpeg;base64,{img_str}"
    except Exception as e:
        return None

def is_image_file(filename: str) -> bool:
    """Check if file is an image based on extension"""
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp'}
    return any(filename.lower().endswith(ext) for ext in image_extensions)

router = APIRouter()

@router.post("/prompts", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    prompt_data: PromptCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new prompt.
    
    This endpoint creates a prompt with the specified configuration.
    """
    try:
        # Validate provider and model exist
        provider = db.query(Provider).filter(Provider.id == prompt_data.provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        model = db.query(Model).filter(Model.id == prompt_data.model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Check if a prompt with the same title already exists for this user
        existing_prompt = db.query(Prompt).filter(
            Prompt.title == prompt_data.title,
            Prompt.user_id == prompt_data.user_id,
            Prompt.is_active == True
        ).first()
        
        if existing_prompt:
            raise HTTPException(
                status_code=400, 
                detail=f"A prompt with title '{prompt_data.title}' already exists. Please use a different title."
            )
        
        prompt = Prompt(
            provider_id=prompt_data.provider_id,
            model_id=prompt_data.model_id,
            title=prompt_data.title,
            text=prompt_data.text,
            system_prompt=prompt_data.system_prompt,
            temperature=prompt_data.temperature,
            max_tokens=prompt_data.max_tokens,
            user_id=prompt_data.user_id
        )
        
        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        
        return PromptResponse.from_orm(prompt)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create prompt: {str(e)}")

@router.get("/prompts/with-versions")
def get_prompts_with_versions(
    user_id: str = "default_user",
    provider_id: Optional[int] = None,
    model_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all prompts with their versions grouped together.
    This endpoint returns prompts with their associated versions as nested data.
    """
    try:
        # Build base query for prompts
        query = db.query(Prompt).filter(
            Prompt.user_id == user_id,
            Prompt.is_active == True
        )
        
        if provider_id:
            query = query.filter(Prompt.provider_id == provider_id)
        if model_id:
            query = query.filter(Prompt.model_id == model_id)
        
        prompts = query.order_by(Prompt.created_at.desc()).all()
        
        result = []
        for prompt in prompts:
            # Get versions for this prompt
            versions = db.query(PromptVersion).filter(
                PromptVersion.prompt_id == prompt.id
            ).order_by(PromptVersion.version_number.desc()).all()
            
            # Get provider and model names
            provider = db.query(Provider).filter(Provider.id == prompt.provider_id).first()
            model = db.query(Model).filter(Model.id == prompt.model_id).first()
            
            prompt_data = {
                "id": prompt.id,
                "uuid": prompt.uuid,
                "title": prompt.title,
                "text": prompt.text,
                "system_prompt": prompt.system_prompt,
                "temperature": prompt.temperature,
                "max_tokens": prompt.max_tokens,
                "provider_id": prompt.provider_id,
                "provider_name": provider.name if provider else None,
                "model_id": prompt.model_id,
                "model_name": model.name if model else None,
                "last_output": prompt.last_output,
                "created_at": prompt.created_at,
                "updated_at": prompt.updated_at,
                "versions_count": len(versions),
                "versions": [
                    {
                        "id": version.id,
                        "version_number": version.version_number,
                        "prompt_text": version.prompt_text,
                        "system_prompt": version.system_prompt,
                        "temperature": version.temperature,
                        "max_tokens": version.max_tokens,
                        "files": version.files,
                        "images": version.images,
                        "output": version.output,
                        "locked_by_user": version.locked_by_user,
                        "created_at": version.created_at
                    }
                    for version in versions
                ]
            }
            result.append(prompt_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch prompts with versions: {str(e)}")

@router.delete("/prompts/{prompt_id}/versions/{version_id}")
async def delete_prompt_version(
    prompt_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific version of a prompt.
    """
    try:
        # Check if prompt exists
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        # Check if version exists
        version = db.query(PromptVersion).filter(
            PromptVersion.id == version_id,
            PromptVersion.prompt_id == prompt_id
        ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        
        # Delete the version
        db.delete(version)
        db.commit()
        
        return {"message": f"Version {version.version_number} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete version: {str(e)}")

@router.get("/prompts", response_model=List[PromptResponse])
def get_prompts(
    user_id: str = "default_user",
    provider_id: Optional[int] = None,
    model_id: Optional[int] = None,
    include_versions: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all prompts, optionally filtered by user, provider, or model.
    
    - **user_id**: Filter by user ID
    - **provider_id**: Filter by provider ID
    - **model_id**: Filter by model ID
    - **include_versions**: Include version information for each prompt
    """
    query = db.query(Prompt)
    
    if user_id:
        query = query.filter(Prompt.user_id == user_id)
    
    if provider_id:
        query = query.filter(Prompt.provider_id == provider_id)
    
    if model_id:
        query = query.filter(Prompt.model_id == model_id)
    
    prompts = query.order_by(Prompt.created_at.desc()).all()
    
    # Add provider and model names to the response
    result = []
    for prompt in prompts:
        prompt_dict = PromptResponse.from_orm(prompt).dict()
        provider = db.query(Provider).filter(Provider.id == prompt.provider_id).first()
        model = db.query(Model).filter(Model.id == prompt.model_id).first()
        prompt_dict['provider_name'] = provider.name if provider else None
        prompt_dict['model_name'] = model.name if model else None
        result.append(prompt_dict)
    
    return result

@router.get("/prompts/{prompt_id}", response_model=PromptResponse)
def get_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific prompt by ID.
    """
    # Validate prompt_id is a positive integer
    if prompt_id <= 0:
        raise HTTPException(status_code=422, detail="Invalid prompt ID. Must be a positive integer.")
    
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    prompt_dict = PromptResponse.from_orm(prompt).dict()
    provider = db.query(Provider).filter(Provider.id == prompt.provider_id).first()
    model = db.query(Model).filter(Model.id == prompt.model_id).first()
    prompt_dict['provider_name'] = provider.name if provider else None
    prompt_dict['model_name'] = model.name if model else None
    
    return prompt_dict

@router.put("/prompts/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: int,
    prompt_data: PromptCreate,
    db: Session = Depends(get_db)
):
    """
    Update a prompt.
    """
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    try:
        # Validate provider and model exist
        provider = db.query(Provider).filter(Provider.id == prompt_data.provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        model = db.query(Model).filter(Model.id == prompt_data.model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Update fields
        prompt.provider_id = prompt_data.provider_id
        prompt.model_id = prompt_data.model_id
        prompt.title = prompt_data.title
        prompt.text = prompt_data.text
        prompt.system_prompt = prompt_data.system_prompt
        prompt.temperature = prompt_data.temperature
        prompt.max_tokens = prompt_data.max_tokens
        # Note: version is now handled by the prompt_versions table
        
        db.commit()
        db.refresh(prompt)
        
        return PromptResponse.from_orm(prompt)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update prompt: {str(e)}")

@router.delete("/prompts/{prompt_id}")
async def delete_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a prompt.
    """
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    try:
        db.delete(prompt)
        db.commit()
        return {"message": "Prompt deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete prompt: {str(e)}")

@router.post("/run")
async def run_prompt(
    prompt_id: Optional[int] = Form(None),
    provider_id: int = Form(...),
    model_id: int = Form(...),
    text: str = Form(...),
    title: Optional[str] = Form(None),
    system_prompt: Optional[str] = Form(None),
    temperature: Optional[float] = Form(0.7),
    max_tokens: Optional[int] = Form(1000),
    include_file_content: Optional[bool] = Form(True),
    file_content_prefix: Optional[str] = Form("File content:\n"),
    knowledge_base_id: Optional[int] = Form(None),
    files: List[UploadFile] = File(default=[]),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    """
    Run a prompt against a specified model and return the output.
    
    This endpoint executes a prompt and returns the generated output with metadata.
    Supports file uploads and RAG (Retrieval-Augmented Generation) with knowledge bases.
    """
    try:
        # Log basic request info
        print(f"Processing request: provider_id={provider_id}, model_id={model_id}, files={len(files) if files else 0}, images={len(images) if images else 0}, knowledge_base_id={knowledge_base_id}")
        # Validate provider and model exist
        provider = db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        model = db.query(Model).filter(Model.id == model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Get existing prompt if prompt_id is provided
        prompt = None
        if prompt_id:
            prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
            if not prompt:
                raise HTTPException(status_code=404, detail="Prompt not found")
        
        # RAG: Search knowledge base if provided
        rag_context = ""
        rag_results = []
        if knowledge_base_id:
            try:
                from app.services.knowledge_base_service import KnowledgeBaseService
                kb_service = KnowledgeBaseService(db)
                
                # Search the knowledge base for relevant context
                search_results = await kb_service.search_knowledge_base(
                    kb_id=knowledge_base_id,
                    query=text,
                    n_results=5  # Top 5 most relevant results
                )
                
                # Format the context from search results
                if search_results.get('results'):
                    context_parts = []
                    for i, result in enumerate(search_results['results'][:5], 1):
                        context_parts.append(f"Context {i}:\n{result.get('document', '')}")
                        rag_results.append({
                            "content": result.get('document', ''),
                            "metadata": result.get('metadata', {}),
                            "score": result.get('distance', 0)
                        })
                    rag_context = "\n\n".join(context_parts)
                    
                    # Enhance the prompt with RAG context
                    if rag_context:
                        enhanced_text = f"""Based on the following context information:

{rag_context}

Question: {text}

Please answer the question using the provided context. If the context doesn't contain enough information to answer the question, please say so."""
                        text = enhanced_text
                        
            except Exception as e:
                print(f"RAG search error: {str(e)}")
                # Continue without RAG context if search fails
        
        # Execute the prompt using the provider service
        start_time = time.time()
        service = ProviderService(db)
        
        try:
            prompt_data = {
                "provider_id": provider.id,
                "model_name": model.name,
                "text": text,
                "system_prompt": system_prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "include_file_content": include_file_content,
                "file_content_prefix": file_content_prefix
            }
            
            # Add files if present
            if files and len(files) > 0:
                prompt_data["files"] = files

            # Process and add images if present
            if images and len(images) > 0:
                image_contents = []
                for img_file in images:
                    base64_image = await process_image(img_file)
                    if base64_image:
                        image_contents.append({
                            "type": "image_url",
                            "image_url": {
                                "url": base64_image,
                                "detail": "low"
                            }
                        })
                
                if image_contents:
                    prompt_data["image_contents"] = image_contents

            result = await service.run_prompt(prompt_data)
            
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            # Create output record (only if we have a prompt_id)
            output_data = {
                'output_text': result.get('output_text', ''),
                'latency_ms': latency_ms,
                'token_usage': result.get('token_usage', {}),
                'cost_usd': result.get('cost', 0.0),
                'response_metadata': result.get('response_metadata', {}),
                'rag_context': rag_context if rag_context else None,
                'rag_results': rag_results if rag_results else None
            }
            
            # Only save to database if we have a prompt_id
            if prompt:
                output = Output(
                    prompt_id=prompt.id,
                    **output_data
                )
                db.add(output)
                db.commit()
                db.refresh(output)
                return OutputResponse.from_orm(output)
            else:
                # For new prompts without a prompt_id, return a simplified response
                # that doesn't require database fields
                from datetime import datetime
                return {
                    "id": None,
                    "prompt_id": None,
                    "output_text": output_data['output_text'],
                    "latency_ms": output_data['latency_ms'],
                    "token_usage": output_data['token_usage'],
                    "cost_usd": output_data['cost_usd'],
                    "response_metadata": output_data['response_metadata'],
                    "rag_context": output_data['rag_context'],
                    "rag_results": output_data['rag_results'],
                    "created_at": datetime.utcnow().isoformat()
                }
            
        except Exception as e:
            # If prompt execution fails, return error without saving
            raise HTTPException(status_code=500, detail=f"Failed to execute prompt: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to run prompt: {str(e)}")

@router.get("/prompts/{prompt_id}/outputs", response_model=List[OutputResponse])
def get_prompt_outputs(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all outputs for a specific prompt.
    """
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    outputs = db.query(Output).filter(Output.prompt_id == prompt_id).order_by(Output.created_at.desc()).all()
    return [OutputResponse.from_orm(output) for output in outputs]

@router.get("/outputs/{output_id}", response_model=OutputResponse)
def get_output(
    output_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific output by ID.
    """
    output = db.query(Output).filter(Output.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
    
    return OutputResponse.from_orm(output)



@router.post("/rag-preview")
async def rag_preview(
    knowledge_base_id: int = Form(...),
    query: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Preview RAG context that would be retrieved for a given query and knowledge base.
    This allows users to see what context will be used before running the actual prompt.
    """
    try:
        from app.services.knowledge_base_service import KnowledgeBaseService
        kb_service = KnowledgeBaseService(db)
        
        # Validate knowledge base exists
        kb = await kb_service.get_knowledge_base(knowledge_base_id)
        if not kb:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        # Search the knowledge base for relevant context
        search_results = await kb_service.search_knowledge_base(
            kb_id=knowledge_base_id,
            query=query,
            n_results=5  # Top 5 most relevant results
        )
        
        # Format the results
        rag_results = []
        context_parts = []
        
        if search_results.get('results'):
            for i, result in enumerate(search_results['results'][:5], 1):
                content = result.get('document', '')
                context_parts.append(f"Context {i}:\n{content}")
                rag_results.append({
                    "content": content,
                    "metadata": result.get('metadata', {}),
                    "score": result.get('distance', 0),
                    "source": result.get('metadata', {}).get('original_filename', 'Unknown')
                })
        
        rag_context = "\n\n".join(context_parts)
        
        # Show enhanced prompt preview
        enhanced_prompt = f"""Based on the following context information:

{rag_context}

Question: {query}

Please answer the question using the provided context. If the context doesn't contain enough information to answer the question, please say so."""

        return {
            "knowledge_base_name": kb.get('name', 'Unknown'),
            "query": query,
            "rag_context": rag_context,
            "enhanced_prompt": enhanced_prompt,
            "results": rag_results,
            "results_count": len(rag_results)
        }
        
    except Exception as e:
        print(f"RAG preview error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to preview RAG context: {str(e)}")

@router.get("/supported-file-types")
async def get_supported_file_types():
    """
    Get list of supported file types for extraction and image processing.
    """
    extraction_service = FileExtractionService()
    return {
        "supported_extensions": extraction_service.get_supported_extensions(),
        "supported_formats": ["PDF", "DOCX", "PPTX"],
        "supported_images": ["PNG", "JPG", "JPEG", "GIF", "BMP"],
        "image_extensions": [".png", ".jpg", ".jpeg", ".gif", ".bmp"]
    }

@router.post("/test-form-data")
async def test_form_data(
    prompt_id: Optional[int] = Form(None),
    provider_id: int = Form(...),
    model_id: int = Form(...),
    text: str = Form(...),
    files: List[UploadFile] = File(default=[])
):
    """
    Test endpoint to debug form data parsing.
    """
    return {
        "prompt_id": prompt_id,
        "provider_id": provider_id,
        "model_id": model_id,
        "text": text,
        "files_count": len(files),
        "file_names": [f.filename for f in files] if files else []
    }

# Versioning endpoints
@router.post("/prompts/create-and-lock")
async def create_and_lock_prompt(
    version_data: dict,
    db: Session = Depends(get_db)
):
    """
    Create a new prompt and lock its first version.
    This is used when locking a version for a new prompt that hasn't been saved yet.
    """
    try:
        # Create the prompt first
        prompt = Prompt(
            provider_id=version_data.get("provider_id"),
            model_id=version_data.get("model_id"),
            title=version_data.get("title", "Untitled Prompt"),
            text=version_data.get("prompt_text", ""),
            system_prompt=version_data.get("system_prompt", ""),
            temperature=version_data.get("temperature", 0.7),
            max_tokens=version_data.get("max_tokens", 1000),
            user_id=version_data.get("user_id", "default_user")
        )
        
        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        
        # Now lock the version
        result = await lock_prompt_version_internal(prompt.id, version_data, db)
        # Add the prompt_id to the result
        result["prompt_id"] = prompt.id
        return result
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        db.rollback()
        print(f"Error creating and locking prompt: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create and lock prompt: {str(e)}")

@router.post("/prompts/{prompt_id}/versions")
async def lock_prompt_version(
    prompt_id: int,
    version_data: dict,
    db: Session = Depends(get_db)
):
    """
    Lock a new version of an existing prompt.
    This creates a versioned snapshot of the prompt with its current state and output.
    """
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    return await lock_prompt_version_internal(prompt_id, version_data, db)

async def lock_prompt_version_internal(
    prompt_id: int,
    version_data: dict,
    db: Session
):
    """
    Internal function to lock a prompt version.
    """
    
    try:
        # Validate required fields
        if not version_data.get("prompt_text"):
            raise ValueError("prompt_text is required")
        if not version_data.get("provider_id"):
            raise ValueError("provider_id is required")
        if not version_data.get("model_id"):
            raise ValueError("model_id is required")
        # Get the next version number
        latest_version = db.query(PromptVersion).filter(
            PromptVersion.prompt_id == prompt_id
        ).order_by(PromptVersion.version_number.desc()).first()
        
        version_number = (latest_version.version_number + 1) if latest_version else 1
        
        # Process files and images to extract metadata
        files_metadata = []
        if version_data.get("files"):
            for file in version_data.get("files", []):
                if hasattr(file, 'name'):  # It's a File object
                    files_metadata.append({
                        "name": file.name,
                        "size": file.size,
                        "type": file.type
                    })
                else:  # It's already metadata
                    files_metadata.append(file)
        
        images_metadata = []
        if version_data.get("images"):
            for image in version_data.get("images", []):
                if hasattr(image, 'name'):  # It's a File object
                    images_metadata.append({
                        "name": image.name,
                        "size": image.size,
                        "type": image.type
                    })
                else:  # It's already metadata
                    images_metadata.append(image)
        
        # Validate and clean output data for JSON serialization
        output_data = version_data.get("output")
        if output_data:
            # Ensure output_data is JSON serializable
            import json
            try:
                # Test JSON serialization
                json.dumps(output_data)
            except (TypeError, ValueError) as e:
                print(f"Warning: Output data is not JSON serializable: {e}")
                # Convert to a serializable format
                if isinstance(output_data, dict):
                    # Try to convert any non-serializable values
                    cleaned_output = {}
                    for key, value in output_data.items():
                        try:
                            json.dumps(value)
                            cleaned_output[key] = value
                        except (TypeError, ValueError):
                            cleaned_output[key] = str(value)
                    output_data = cleaned_output
                else:
                    output_data = str(output_data)
        
        # Get prompt data for fallback values (only if prompt exists)
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        
        # Create the version
        version = PromptVersion(
            prompt_id=prompt_id,
            version_number=version_number,
            prompt_text=version_data.get("prompt_text", prompt.text if prompt else ""),
            system_prompt=version_data.get("system_prompt", prompt.system_prompt if prompt else ""),
            temperature=version_data.get("temperature", prompt.temperature if prompt else 0.7),
            max_tokens=version_data.get("max_tokens", prompt.max_tokens if prompt else 1000),
            provider_id=version_data.get("provider_id", prompt.provider_id if prompt else None),
            model_id=version_data.get("model_id", prompt.model_id if prompt else None),
            files=files_metadata,
            images=images_metadata,
            include_file_content=version_data.get("include_file_content", True),
            file_content_prefix=version_data.get("file_content_prefix", "File content:\n"),
            output=output_data,
            locked_by_user=version_data.get("locked_by_user", "default_user")
        )
        
        db.add(version)
        db.commit()
        db.refresh(version)
        
        return {
            "id": version.id,
            "prompt_id": prompt_id,
            "version_number": version.version_number,
            "created_at": version.created_at,
            "message": f"Version {version_number} locked successfully"
        }
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        db.rollback()
        print(f"Error locking version: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to lock version: {str(e)}")

@router.get("/prompts/{prompt_id}/versions")
def get_prompt_versions(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all versions of a prompt.
    """
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    versions = db.query(PromptVersion).filter(
        PromptVersion.prompt_id == prompt_id
    ).order_by(PromptVersion.version_number.desc()).all()
    
    return [
        {
            "id": version.id,
            "version_number": version.version_number,
            "prompt_text": version.prompt_text,
            "system_prompt": version.system_prompt,
            "temperature": version.temperature,
            "max_tokens": version.max_tokens,
            "provider_id": version.provider_id,
            "model_id": version.model_id,
            "model_name": db.query(Model).filter(Model.id == version.model_id).first().name if version.model_id else None,
            "files": version.files,
            "images": version.images,
            "include_file_content": version.include_file_content,
            "file_content_prefix": version.file_content_prefix,
            "output": version.output,
            "locked_by_user": version.locked_by_user,
            "created_at": version.created_at
        }
        for version in versions
    ]

@router.post("/prompts/{prompt_id}/duplicate")
async def duplicate_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    Duplicate a prompt to create a new prompt based on the existing one.
    """
    original_prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not original_prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    try:
        # Create a new prompt based on the original
        new_prompt = Prompt(
            user_id=original_prompt.user_id,
            provider_id=original_prompt.provider_id,
            model_id=original_prompt.model_id,
            title=f"{original_prompt.title} (Copy)",
            text=original_prompt.text,
            system_prompt=original_prompt.system_prompt,
            temperature=original_prompt.temperature,
            max_tokens=original_prompt.max_tokens,
            last_output=original_prompt.last_output
        )
        
        db.add(new_prompt)
        db.commit()
        db.refresh(new_prompt)
        
        return PromptResponse.from_orm(new_prompt)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to duplicate prompt: {str(e)}")