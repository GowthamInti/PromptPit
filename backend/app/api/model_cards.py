# backend/app/api/model_cards.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.database.models import ModelCard, Experiment, OptimizationCycle, Prompt, Output, Provider, Model
from app.schemas.model_card_schemas import (
    ModelCardCreate, ModelCardResponse, ModelCardUpdate, ModelCardGenerate
)

router = APIRouter()

@router.post("/model-cards", response_model=ModelCardResponse, status_code=status.HTTP_201_CREATED)
async def create_model_card(
    card_data: ModelCardCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new model card.
    
    This endpoint creates a model card with the specified metadata.
    """
    try:
        model_card = ModelCard(
            title=card_data.title,
            description=card_data.description,
            status=card_data.status,
            experiment_ids=card_data.experiment_ids,
            user_id=card_data.user_id
        )
        
        db.add(model_card)
        db.commit()
        db.refresh(model_card)
        
        return ModelCardResponse.from_orm(model_card)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create model card: {str(e)}")

@router.post("/model-cards/generate", response_model=ModelCardResponse, status_code=status.HTTP_201_CREATED)
async def generate_model_card(
    card_data: ModelCardGenerate,
    db: Session = Depends(get_db)
):
    """
    Generate a model card from experiments.
    
    This endpoint automatically generates a model card by analyzing the specified experiments
    and calculating metrics, models tested, and providers used.
    """
    try:
        # Validate that all experiments exist
        experiments = db.query(Experiment).filter(
            Experiment.id.in_(card_data.experiment_ids)
        ).all()
        
        if len(experiments) != len(card_data.experiment_ids):
            raise HTTPException(status_code=404, detail="One or more experiments not found")
        
        # Calculate metrics from experiments
        total_prompts = 0
        total_outputs = 0
        total_evaluations = 0
        total_cost = 0.0
        models_tested = set()
        providers = set()
        
        for experiment in experiments:
            # Get optimization cycles for this experiment
            cycles = db.query(OptimizationCycle).filter(
                OptimizationCycle.experiment_id == experiment.id
            ).all()
            
            for cycle in cycles:
                if cycle.prompt_id:
                    total_prompts += 1
                    
                    # Get prompt details to find provider and model
                    prompt = db.query(Prompt).filter(Prompt.id == cycle.prompt_id).first()
                    if prompt:
                        provider = db.query(Provider).filter(Provider.id == prompt.provider_id).first()
                        model = db.query(Model).filter(Model.id == prompt.model_id).first()
                        
                        if provider:
                            providers.add(provider.name)
                        if model:
                            models_tested.add(model.name)
                
                if cycle.output_id:
                    total_outputs += 1
                    
                    # Get output details for cost calculation
                    output = db.query(Output).filter(Output.id == cycle.output_id).first()
                    if output and output.cost_usd:
                        total_cost += output.cost_usd
        
        # Calculate average score from experiments
        avg_score = sum(exp.current_score for exp in experiments) / len(experiments) if experiments else 0.0
        
        # Create model card
        model_card = ModelCard(
            title=card_data.title,
            description=card_data.description,
            status="draft",
            experiment_ids=card_data.experiment_ids,
            user_id=card_data.user_id,
            metrics={
                "total_prompts": total_prompts,
                "total_outputs": total_outputs,
                "total_evaluations": total_evaluations,
                "avg_score": round(avg_score, 2),
                "total_cost": round(total_cost, 3)
            },
            models_tested=list(models_tested),
            providers=list(providers)
        )
        
        db.add(model_card)
        db.commit()
        db.refresh(model_card)
        
        return ModelCardResponse.from_orm(model_card)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate model card: {str(e)}")

@router.get("/model-cards", response_model=List[ModelCardResponse])
def get_model_cards(
    user_id: str = "default_user",
    status: str = None,
    db: Session = Depends(get_db)
):
    """
    Get all model cards, optionally filtered by user or status.
    
    - **user_id**: Filter by user ID
    - **status**: Filter by card status (draft, published, archived)
    """
    query = db.query(ModelCard)
    
    if user_id:
        query = query.filter(ModelCard.user_id == user_id)
    
    if status:
        query = query.filter(ModelCard.status == status)
    
    model_cards = query.order_by(ModelCard.created_at.desc()).all()
    return [ModelCardResponse.from_orm(card) for card in model_cards]

@router.get("/model-cards/{card_id}", response_model=ModelCardResponse)
def get_model_card(
    card_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific model card by ID.
    """
    model_card = db.query(ModelCard).filter(ModelCard.id == card_id).first()
    if not model_card:
        raise HTTPException(status_code=404, detail="Model card not found")
    
    return ModelCardResponse.from_orm(model_card)

@router.put("/model-cards/{card_id}", response_model=ModelCardResponse)
async def update_model_card(
    card_id: int,
    card_data: ModelCardUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a model card's metadata.
    """
    model_card = db.query(ModelCard).filter(ModelCard.id == card_id).first()
    if not model_card:
        raise HTTPException(status_code=404, detail="Model card not found")
    
    try:
        update_data = card_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(model_card, field, value)
        
        db.commit()
        db.refresh(model_card)
        
        return ModelCardResponse.from_orm(model_card)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update model card: {str(e)}")

@router.delete("/model-cards/{card_id}")
async def delete_model_card(
    card_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a model card.
    """
    model_card = db.query(ModelCard).filter(ModelCard.id == card_id).first()
    if not model_card:
        raise HTTPException(status_code=404, detail="Model card not found")
    
    try:
        db.delete(model_card)
        db.commit()
        return {"message": "Model card deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete model card: {str(e)}")

@router.post("/model-cards/{card_id}/export")
async def export_model_card(
    card_id: int,
    format: str = "json",
    db: Session = Depends(get_db)
):
    """
    Export a model card in various formats.
    
    - **format**: Export format (json, markdown, pdf)
    """
    model_card = db.query(ModelCard).filter(ModelCard.id == card_id).first()
    if not model_card:
        raise HTTPException(status_code=404, detail="Model card not found")
    
    if format not in ["json", "markdown", "pdf"]:
        raise HTTPException(status_code=400, detail="Format must be one of: json, markdown, pdf")
    
    try:
        # For now, return JSON format
        # In a real implementation, you would generate the appropriate format
        card_data = ModelCardResponse.from_orm(model_card)
        
        if format == "json":
            return card_data.dict()
        elif format == "markdown":
            # Generate markdown format
            markdown = f"""# {card_data.title}

{card_data.description or ''}

## Metrics
- Total Prompts: {card_data.metrics.get('total_prompts', 0)}
- Total Outputs: {card_data.metrics.get('total_outputs', 0)}
- Average Score: {card_data.metrics.get('avg_score', 0)}
- Total Cost: ${card_data.metrics.get('total_cost', 0)}

## Models Tested
{', '.join(card_data.models_tested or [])}

## Providers
{', '.join(card_data.providers or [])}

## Experiments
{', '.join(str(exp_id) for exp_id in card_data.experiment_ids or [])}

Generated on: {card_data.created_at}
"""
            return {"markdown": markdown}
        else:
            # PDF generation would go here
            return {"message": "PDF export not yet implemented"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export model card: {str(e)}")

@router.post("/model-cards/{card_id}/publish")
async def publish_model_card(
    card_id: int,
    db: Session = Depends(get_db)
):
    """
    Publish a model card by changing its status to 'published'.
    """
    model_card = db.query(ModelCard).filter(ModelCard.id == card_id).first()
    if not model_card:
        raise HTTPException(status_code=404, detail="Model card not found")
    
    if model_card.status != 'draft':
        raise HTTPException(status_code=400, detail="Model card can only be published if it's in draft status")
    
    try:
        model_card.status = 'published'
        db.commit()
        db.refresh(model_card)
        
        return {"message": "Model card published successfully", "model_card": ModelCardResponse.from_orm(model_card)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to publish model card: {str(e)}")
