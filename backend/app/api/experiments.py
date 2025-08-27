# backend/app/api/experiments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.database.models import Experiment, OptimizationCycle, Prompt, Output
from app.schemas.experiment_schemas import (
    ExperimentCreate, ExperimentResponse, ExperimentUpdate,
    OptimizationCycleCreate, OptimizationCycleResponse
)

router = APIRouter()

@router.post("/experiments", response_model=ExperimentResponse, status_code=status.HTTP_201_CREATED)
async def create_experiment(
    experiment_data: ExperimentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new experiment for prompt optimization.
    
    This endpoint creates an experiment with the specified parameters and initializes
    the optimization process.
    """
    try:
        experiment = Experiment(
            name=experiment_data.name,
            description=experiment_data.description,
            type=experiment_data.type,
            target_score=experiment_data.target_score,
            max_iterations=experiment_data.max_iterations,
            dataset_size=experiment_data.dataset_size,
            report_type=experiment_data.report_type,
            user_id=experiment_data.user_id,
            status='pending'
        )
        
        db.add(experiment)
        db.commit()
        db.refresh(experiment)
        
        return ExperimentResponse.from_orm(experiment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create experiment: {str(e)}")

@router.get("/experiments", response_model=List[ExperimentResponse])
def get_experiments(
    user_id: str = "default_user",
    status: str = None,
    type: str = None,
    db: Session = Depends(get_db)
):
    """
    Get all experiments, optionally filtered by user, status, or type.
    
    - **user_id**: Filter by user ID
    - **status**: Filter by experiment status (pending, running, completed, failed)
    - **type**: Filter by experiment type (report_generation, content_creation, etc.)
    """
    query = db.query(Experiment)
    
    if user_id:
        query = query.filter(Experiment.user_id == user_id)
    
    if status:
        query = query.filter(Experiment.status == status)
    
    if type:
        query = query.filter(Experiment.type == type)
    
    experiments = query.order_by(Experiment.created_at.desc()).all()
    return [ExperimentResponse.from_orm(exp) for exp in experiments]

@router.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific experiment by ID with all its optimization cycles.
    """
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return ExperimentResponse.from_orm(experiment)

@router.put("/experiments/{experiment_id}", response_model=ExperimentResponse)
async def update_experiment(
    experiment_id: int,
    experiment_data: ExperimentUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an experiment's status, progress, or other fields.
    """
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    try:
        update_data = experiment_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(experiment, field, value)
        
        db.commit()
        db.refresh(experiment)
        
        return ExperimentResponse.from_orm(experiment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update experiment: {str(e)}")

@router.delete("/experiments/{experiment_id}")
async def delete_experiment(
    experiment_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete an experiment and all its optimization cycles.
    """
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    try:
        db.delete(experiment)
        db.commit()
        return {"message": "Experiment deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete experiment: {str(e)}")

@router.post("/experiments/{experiment_id}/cycles", response_model=OptimizationCycleResponse)
async def add_optimization_cycle(
    experiment_id: int,
    cycle_data: OptimizationCycleCreate,
    db: Session = Depends(get_db)
):
    """
    Add an optimization cycle to an experiment.
    
    This endpoint adds a new iteration with the results of prompt optimization.
    """
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    try:
        cycle = OptimizationCycle(
            experiment_id=experiment_id,
            iteration=cycle_data.iteration,
            score=cycle_data.score,
            prompt_changes=cycle_data.prompt_changes,
            prompt_id=cycle_data.prompt_id,
            output_id=cycle_data.output_id
        )
        
        db.add(cycle)
        
        # Update experiment progress and score
        if cycle_data.score is not None:
            experiment.current_score = cycle_data.score
            experiment.iterations = cycle_data.iteration
        
        # Calculate progress
        if experiment.max_iterations > 0:
            experiment.progress = min(100.0, (cycle_data.iteration / experiment.max_iterations) * 100)
        
        # Update status if completed
        if cycle_data.iteration >= experiment.max_iterations:
            experiment.status = 'completed'
        
        db.commit()
        db.refresh(cycle)
        
        return OptimizationCycleResponse.from_orm(cycle)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add optimization cycle: {str(e)}")

@router.get("/experiments/{experiment_id}/cycles", response_model=List[OptimizationCycleResponse])
def get_optimization_cycles(
    experiment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all optimization cycles for an experiment.
    """
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    cycles = db.query(OptimizationCycle).filter(
        OptimizationCycle.experiment_id == experiment_id
    ).order_by(OptimizationCycle.iteration).all()
    
    return [OptimizationCycleResponse.from_orm(cycle) for cycle in cycles]

@router.post("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: int,
    db: Session = Depends(get_db)
):
    """
    Start an experiment by changing its status to 'running'.
    """
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if experiment.status != 'pending':
        raise HTTPException(status_code=400, detail="Experiment can only be started if it's pending")
    
    try:
        experiment.status = 'running'
        experiment.progress = 0.0
        db.commit()
        db.refresh(experiment)
        
        return {"message": "Experiment started successfully", "experiment": ExperimentResponse.from_orm(experiment)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start experiment: {str(e)}")
