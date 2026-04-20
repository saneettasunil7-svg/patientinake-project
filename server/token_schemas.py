from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TokenCreate(BaseModel):
    doctor_id: int
    reason_for_visit: Optional[str] = None

class TokenResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    token_number: int
    slot_id: Optional[int] = None
    status: str
    is_emergency: bool = False
    payment_status: str = "pending"
    payment_amount: int = 500
    created_at: datetime
    called_at: Optional[datetime]
    completed_at: Optional[datetime]
    voice_reason_url: Optional[str] = None

    class Config:
        from_attributes = True

class TokenQueueResponse(BaseModel):
    id: int
    token_number: int
    patient_id: int
    patient_name: str
    status: str
    is_emergency: bool = False
    payment_status: str = "pending"
    payment_amount: int = 500
    created_at: datetime
    waiting_time: int  # in minutes
    reason_for_visit: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone_number: Optional[str] = None
    medical_history_summary: Optional[str] = None
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    voice_reason_url: Optional[str] = None
    document_count: int = 0
    appointment_notes: Optional[str] = None

class EmergencyTokenRequest(BaseModel):
    reason: Optional[str] = "Medical Emergency"

class DoctorAvailabilityUpdate(BaseModel):
    is_available: bool

class DoctorAvailabilityResponse(BaseModel):
    doctor_id: int
    is_available: bool
    unavailable_days: Optional[List[int]] = []
    unavailable_dates: Optional[List[str]] = []
    last_updated: datetime

    class Config:
        from_attributes = True

class TokenReceiptResponse(BaseModel):
    id: int
    token_number: int
    patient_name: str
    patient_email: str
    doctor_name: str
    doctor_specialization: str
    status: str
    payment_status: str
    payment_amount: int
    created_at: datetime
    
    class Config:
        from_attributes = True
