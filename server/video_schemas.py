from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class VideoSessionCreate(BaseModel):
    token_id: int

class VideoSessionResponse(BaseModel):
    id: int
    token_id: int
    session_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    remaining_seconds: Optional[int] = None
    patient_id: Optional[int] = None

    class Config:
        from_attributes = True

class SignalData(BaseModel):
    session_id: str
    type: str  # offer, answer, ice-candidate
    data: dict
