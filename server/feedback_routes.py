from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, feedback_schemas
import auth
from datetime import datetime

router = APIRouter(
    prefix="/feedback",
    tags=["feedback"],
    responses={404: {"detail": "Not found"}},
)

@router.post("/", response_model=feedback_schemas.FeedbackResponse)
async def create_feedback(
    feedback: feedback_schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "patient":
        # Allowing only patients to give feedback for now, or maybe generic
        pass 

    new_feedback = models.Feedback(
        doctor_id=feedback.doctor_id,
        patient_id=current_user.id,
        session_id=feedback.session_id,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return new_feedback
