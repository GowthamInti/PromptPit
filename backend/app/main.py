from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import uvicorn
import os

from app.database.connection import get_db, engine
from app.database import models
from app.api import providers, prompts, knowledge_bases, chat

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI with enhanced documentation
app = FastAPI(
    title="🎯 Prompt Optimization Playground API",
    description="""
    **A powerful tool for experimenting with prompts across multiple LLM providers**
    
    ## Features
    
    * 🤖 **Multi-Provider Support**: OpenAI, Groq, and more
    * 📝 **Prompt Management**: Save, version, and organize your prompts
    * 📚 **Knowledge Base**: Create and manage document collections with vector search
    * 📊 **Performance Tracking**: Latency, tokens, costs
    * 🔄 **Version Control**: Lock and manage prompt versions
    
    ## Quick Start
    
    1. **Add Provider**: `POST /api/providers` with your API key
    2. **Run Prompt**: `POST /api/run` to execute against any model
    3. **Create Knowledge Base**: `POST /api/knowledge-bases` for document management
    4. **Upload & Process**: Add documents and process with LLM
    
    ## Supported Providers
    
    - **OpenAI**: GPT-4, GPT-3.5-turbo, and more
    - **Groq**: Llama2, Mixtral, and other open-source models
    
    """,
    version="1.0.0",
    terms_of_service="https://example.com/terms/",
    contact={
        "name": "Prompt Playground Team",
        "email": "contact@example.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {
            "name": "providers",
            "description": "Manage LLM providers and API keys. Add OpenAI, Groq, and fetch available models."
        },
        {
            "name": "prompts", 
            "description": "Create, run, and manage prompts. Core functionality for prompt execution and versioning."
        },
        {
            "name": "knowledge-bases",
            "description": "Create and manage knowledge bases with document upload, processing, and vector search."
        }
    ]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],  # Frontend URLs + Backend serving frontend
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(providers.router, prefix="/api", tags=["providers"])
app.include_router(prompts.router, prefix="/api", tags=["prompts"])
app.include_router(knowledge_bases.router, prefix="/api", tags=["knowledge-bases"])
app.include_router(chat.router, prefix="/api", tags=["chat"])

# Health check with detailed info
@app.get("/api/health", tags=["health"])
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint with system status.
    
    Returns API status, database connectivity, and basic stats.
    """
    try:
        # Test database connection
        from sqlalchemy import text
        result = db.execute(text("SELECT 1")).fetchone()
        db_status = "healthy" if result else "unhealthy"
        
        # Get basic stats
        provider_count = db.query(models.Provider).count()
        prompt_count = db.query(models.Prompt).count()
        knowledge_base_count = db.query(models.KnowledgeBase).count()
        
        return {
            "status": "healthy",
            "version": "1.0.0",
            "database": db_status,
            "stats": {
                "providers": provider_count,
                "prompts": prompt_count,
                "knowledge_bases": knowledge_base_count
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# Serve frontend static files (for production deployment)
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
    
    # Catch-all route to serve index.html for client-side routing
    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        from fastapi.responses import FileResponse
        return FileResponse("static/index.html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)