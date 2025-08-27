# backend/app/api/judge.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.database.models import Evaluation, Output, Provider, Model
from app.schemas.judge_schemas import JudgeRequest, JudgeResponse, EvaluationResponse
from app.services.provider_service import ProviderService
import time

router = APIRouter()

@router.post("/judge", response_model=JudgeResponse)
async def run_judge(
    judge_data: JudgeRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluate an output using a judge LLM.
    
    This endpoint uses a judge model to evaluate the quality of an output based on
    specified criteria and returns a score with feedback.
    """
    try:
        # Validate output exists
        output = db.query(Output).filter(Output.id == judge_data.output_id).first()
        if not output:
            raise HTTPException(status_code=404, detail="Output not found")
        
        # Validate judge provider and model exist
        judge_provider = None
        judge_model = None
        
        if judge_data.judge_provider_id:
            judge_provider = db.query(Provider).filter(Provider.id == judge_data.judge_provider_id).first()
            if not judge_provider:
                raise HTTPException(status_code=404, detail="Judge provider not found")
        
        if judge_data.judge_model_id:
            judge_model = db.query(Model).filter(Model.id == judge_data.judge_model_id).first()
            if not judge_model:
                raise HTTPException(status_code=404, detail="Judge model not found")
        
        # Build judge prompt
        judge_prompt = build_judge_prompt(
            output.output_text,
            judge_data.criteria,
            judge_data.scale,
            judge_data.explanation_required
        )
        
        # Execute judge evaluation
        start_time = time.time()
        service = ProviderService(db)
        
        try:
            result = await service.run_prompt({
                "provider_id": judge_provider.id if judge_provider else 1,
                "model_name": judge_model.name if judge_model else "gpt-4",
                "text": judge_prompt,
                "system_prompt": "You are an expert evaluator. Provide clear, objective assessments.",
                "temperature": 0.1,  # Low temperature for consistent evaluation
                "max_tokens": 500
            })
            
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            # Parse judge response
            judge_response = result.get('output_text', '')
            score, feedback = parse_judge_response(judge_response, judge_data.scale)
            
            # Create evaluation record
            evaluation = Evaluation(
                output_id=judge_data.output_id,
                judge_provider_id=judge_data.judge_provider_id,
                judge_model_id=judge_data.judge_model_id,
                judge_prompt=judge_prompt,
                score=score,
                feedback=feedback,
                criteria=judge_data.criteria
            )
            
            db.add(evaluation)
            db.commit()
            db.refresh(evaluation)
            
            return JudgeResponse(
                score=score,
                feedback=feedback,
                evaluation_id=evaluation.id,
                latency_ms=latency_ms
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to execute judge evaluation: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to run judge evaluation: {str(e)}")

@router.get("/evaluations", response_model=List[EvaluationResponse])
def get_evaluations(
    output_id: Optional[int] = None,
    judge_provider_id: Optional[int] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Get all evaluations, optionally filtered by various criteria.
    
    - **output_id**: Filter by output ID
    - **judge_provider_id**: Filter by judge provider ID
    - **min_score**: Filter by minimum score
    - **max_score**: Filter by maximum score
    """
    query = db.query(Evaluation)
    
    if output_id:
        query = query.filter(Evaluation.output_id == output_id)
    
    if judge_provider_id:
        query = query.filter(Evaluation.judge_provider_id == judge_provider_id)
    
    if min_score is not None:
        query = query.filter(Evaluation.score >= min_score)
    
    if max_score is not None:
        query = query.filter(Evaluation.score <= max_score)
    
    evaluations = query.order_by(Evaluation.created_at.desc()).all()
    return [EvaluationResponse.from_orm(eval) for eval in evaluations]

@router.get("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific evaluation by ID.
    """
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    return EvaluationResponse.from_orm(evaluation)

@router.get("/outputs/{output_id}/evaluations", response_model=List[EvaluationResponse])
def get_output_evaluations(
    output_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all evaluations for a specific output.
    """
    output = db.query(Output).filter(Output.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
    
    evaluations = db.query(Evaluation).filter(
        Evaluation.output_id == output_id
    ).order_by(Evaluation.created_at.desc()).all()
    
    return [EvaluationResponse.from_orm(eval) for eval in evaluations]

def build_judge_prompt(output_text: str, criteria: dict, scale: int = 10, explanation_required: bool = True) -> str:
    """
    Build a judge prompt based on the output and evaluation criteria.
    """
    prompt = f"""Please evaluate the following output based on the specified criteria.

OUTPUT TO EVALUATE:
{output_text}

EVALUATION CRITERIA:
"""
    
    for criterion, description in criteria.items():
        prompt += f"- {criterion}: {description}\n"
    
    prompt += f"""
SCALE: 1-{scale} (where 1 is poor and {scale} is excellent)

Please provide your evaluation in the following format:
Score: [number between 1-{scale}]
Feedback: [detailed explanation of your assessment]

"""
    
    if explanation_required:
        prompt += "Please provide detailed feedback explaining your score and any specific areas for improvement."
    else:
        prompt += "Please provide brief feedback explaining your score."
    
    return prompt

def parse_judge_response(response: str, scale: int = 10) -> tuple[float, str]:
    """
    Parse the judge response to extract score and feedback.
    """
    try:
        lines = response.strip().split('\n')
        score = None
        feedback = []
        
        for line in lines:
            line = line.strip()
            if line.lower().startswith('score:'):
                score_text = line.split(':', 1)[1].strip()
                score = float(score_text)
                # Ensure score is within valid range
                score = max(1, min(scale, score))
            elif line.lower().startswith('feedback:'):
                feedback_text = line.split(':', 1)[1].strip()
                feedback.append(feedback_text)
            elif line and not line.lower().startswith('score:') and score is not None:
                feedback.append(line)
        
        if score is None:
            # Try to extract score from the response if not found in expected format
            import re
            score_match = re.search(r'(\d+(?:\.\d+)?)', response)
            if score_match:
                score = float(score_match.group(1))
                score = max(1, min(scale, score))
            else:
                score = scale / 2  # Default to middle score if can't parse
        
        feedback_text = ' '.join(feedback) if feedback else "No detailed feedback provided."
        
        return score, feedback_text
        
    except Exception as e:
        # Fallback parsing
        return scale / 2, f"Error parsing judge response: {str(e)}"
