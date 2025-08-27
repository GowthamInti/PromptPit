from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import uvicorn
import os

from app.database.connection import get_db, engine
from app.database import models
from app.api import providers, prompts, judge, experiments, model_cards

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
    * ⚖️ **Judge LLM Evaluation**: Automated quality scoring
    * 📊 **Performance Tracking**: Latency, tokens, costs
    * 🧪 **Experiments**: Create and manage optimization experiments
    * 📋 **Model Cards**: Generate shareable experiment summaries
    
    ## Quick Start
    
    1. **Add Provider**: `POST /api/providers` with your API key
    2. **Run Prompt**: `POST /api/run` to execute against any model
    3. **Evaluate**: `POST /api/judge` to score outputs
    4. **Create Experiment**: `POST /api/experiments` for optimization
    5. **Generate Model Card**: `POST /api/model-cards/generate` for summaries
    
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
            "description": "Create, run, and manage prompts. Core functionality for prompt execution."
        },
        {
            "name": "judge",
            "description": "Evaluate outputs using judge LLMs. Score and provide feedback on responses."
        },
        {
            "name": "experiments",
            "description": "Create and manage optimization experiments with iterative refinement cycles."
        },
        {
            "name": "model-cards",
            "description": "Generate and manage model cards for experiment summaries and sharing."
        }
    ]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(providers.router, prefix="/api", tags=["providers"])
app.include_router(prompts.router, prefix="/api", tags=["prompts"])
app.include_router(judge.router, prefix="/api", tags=["judge"])
app.include_router(experiments.router, prefix="/api", tags=["experiments"])
app.include_router(model_cards.router, prefix="/api", tags=["model-cards"])

# Health check with detailed info
@app.get("/api/health", tags=["health"])
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint with system status.
    
    Returns API status, database connectivity, and basic stats.
    """
    try:
        # Test database connection
        result = db.execute("SELECT 1").fetchone()
        db_status = "healthy" if result else "unhealthy"
        
        # Get basic stats
        provider_count = db.query(models.Provider).count()
        prompt_count = db.query(models.Prompt).count()
        experiment_count = db.query(models.Experiment).count()
        model_card_count = db.query(models.ModelCard).count()
        
        return {
            "status": "healthy",
            "version": "1.0.0",
            "database": db_status,
            "stats": {
                "providers": provider_count,
                "prompts": prompt_count,
                "experiments": experiment_count,
                "model_cards": model_card_count
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)