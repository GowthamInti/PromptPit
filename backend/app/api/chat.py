from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime
import time

from app.database.connection import get_db
from app.database.models import Provider, Model
from app.services.memory import memory_service
from app.services.provider_service import ProviderService
from app.api.prompts import process_image

router = APIRouter()

# Pydantic models for request/response
class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    system_prompt: Optional[str] = None

class ChatMessageResponse(BaseModel):
    user_message: Dict
    ai_message: Dict
    conversation_id: str
    timestamp: str
    error: Optional[str] = None

class ConversationHistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict]
    system_prompt: str
    created_at: str
    last_updated: str

class StartConversationRequest(BaseModel):
    session_id: Optional[str] = None
    system_prompt: Optional[str] = None

class StartConversationResponse(BaseModel):
    session_id: str
    system_prompt: str
    created_at: str

@router.post("/chat/start", response_model=StartConversationResponse)
async def start_conversation(
    request: StartConversationRequest,
    db: Session = Depends(get_db)
):
    """Start a new chat conversation"""
    try:
        # Use provided session_id or generate a new one
        session_id = request.session_id or str(uuid.uuid4())
        
        # Initialize memory for the session
        memory_service.get_session_history(session_id)
        
        return StartConversationResponse(
            session_id=session_id,
            system_prompt=request.system_prompt or "You are a helpful AI assistant.",
            created_at=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start conversation: {str(e)}")
@router.post("/chat/send", response_model=ChatMessageResponse)
async def send_message(
    message: str = Form(...),
    session_id: Optional[str] = Form(None),
    provider_id: int = Form(...),
    model_id: int = Form(...),
    system_prompt: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    """Send a message and get AI response"""
    try:
        # Get provider and model
        provider = db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")

        model = db.query(Model).filter(Model.id == model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")

        if model.provider_id != provider.id:
            raise HTTPException(status_code=400, detail="Model does not belong to specified provider")

        # Session handling
        session_id = session_id or str(uuid.uuid4())
        history = memory_service.get_session_history(session_id)

        # Add user message to memory
        history.add_user_message(message)

        # Build conversation context (exclude the current message that was just added)
        from langchain.schema import HumanMessage
        conversation_context = ""
        if history.messages and len(history.messages) > 1:  # More than just the current message
            # Get recent messages but exclude the last one (current message)
            recent_messages = history.messages[:-1][-10:]  # Last 10 messages excluding current
            conversation_context = "\n\n".join([
                f"{'User' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}"
                for msg in recent_messages
            ])

        enhanced_message = (
            f"Previous conversation context:\n{conversation_context}\n\nCurrent message: {message}"
            if conversation_context else message
        )

        # Debug logging for files and images
        print(f"Chat endpoint - Received files: {files}, type: {type(files)}, length: {len(files) if files else 0}")
        print(f"Chat endpoint - Received images: {images}, type: {type(images)}, length: {len(images) if images else 0}")
        
        # Build prompt data similar to run_prompt endpoint
        prompt_data = {
            "provider_id": provider.id,
            "model_name": model.name,
            "text": enhanced_message,
            "system_prompt": system_prompt or "You are a helpful AI assistant. Continue the conversation naturally.",
            "include_file_content": bool(files or images),
            "file_content_prefix": "Content extracted from documents:\n",
            "structured_output": False,
            "json_schema": None
        }
        
        # Add files if present (pass UploadFile objects directly like in run_prompt)
        if files and len(files) > 0:
            prompt_data["files"] = files

        # Process and add images if present (same approach as run_prompt)
        if images and len(images) > 0:
            image_contents = []
            for img_file in images:
                base64_image = await process_image(img_file)
                if base64_image:
                    image_contents.append({
                        "type": "image_url",
                        "image_url": {
                            "url": base64_image,
                        }
                    })
            
            if image_contents:
                prompt_data["image_contents"] = image_contents

        # Call provider service
        service = ProviderService(db)
        start_time = time.time()
        result = await service.run_prompt(prompt_data)
        end_time = time.time()

        # Add AI response to memory
        from langchain.schema import AIMessage
        ai_output = result.get("output_text", "")
        history.add_ai_message(ai_output)

        latency_ms = (end_time - start_time) * 1000

        # Response
        user_message = {
            "id": len(history.messages) - 1,
            "content": message,
            "role": "user",
            "timestamp": datetime.now().isoformat()
        }

        ai_message = {
            "id": len(history.messages),
            "content": ai_output,
            "role": "assistant",
            "timestamp": datetime.now().isoformat()
        }

        return ChatMessageResponse(
            user_message=user_message,
            ai_message=ai_message,
            conversation_id=session_id,
            timestamp=datetime.now().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


@router.delete("/chat/{session_id}")
async def clear_conversation(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Clear a conversation session"""
    try:
        success = memory_service.clear_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"message": "Conversation cleared successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear conversation: {str(e)}")


@router.get("/chat/{session_id}/status")
async def get_conversation_status(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get conversation status and metadata"""
    try:
        conversation = chat_service.get_conversation(session_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {
            "session_id": session_id,
            "message_count": len(conversation['messages']),
            "created_at": conversation['created_at'].isoformat(),
            "last_updated": conversation['last_updated'].isoformat(),
            "system_prompt": conversation['system_prompt'],
            "is_active": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation status: {str(e)}")
