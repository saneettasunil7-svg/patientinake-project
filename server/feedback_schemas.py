from pydantic import BaseModel
from typing import Optional

class FeedbackCreate(BaseModel):
    doctor_id: int
    session_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    doctor_id: int
    session_id: Optional[str]
    rating: int
    comment: Optional[str]
    created_at: str

    class Config:
        from_attributes = True
