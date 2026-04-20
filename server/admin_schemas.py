from pydantic import BaseModel, EmailStr
from typing import Optional

class DoctorCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    specialization: str
    bio: Optional[str] = None

class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

class DoctorResponse(BaseModel):
    id: int
    email: str
    full_name: str
    specialization: Optional[str] = None
    bio: Optional[str]
    profile_photo: Optional[str] = None
    is_active: bool
    is_verified: bool = False
    is_available: bool

    class Config:
        from_attributes = True

class PolicyBase(BaseModel):
    title: str
    content: str

class PolicyCreate(PolicyBase):
    pass

class PolicyResponse(PolicyBase):
    id: int
    last_updated: str
    
    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: str
    timestamp: str

    class Config:
        from_attributes = True

class StatsResponse(BaseModel):
    total_doctors: int
    active_doctors: int
    verified_doctors: int
    total_patients: int
    total_appointments: int
