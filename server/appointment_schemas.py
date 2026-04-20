from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class DoctorMiniResponse(BaseModel):
    full_name: str
    specialization: str

    class Config:
        from_attributes = True

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    status: str
    notes: Optional[str]
    created_at: datetime
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None

    class Config:
        from_attributes = True

class MedicalRecordCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    diagnosis: str
    treatment: str
    prescription: Optional[str] = None
    follow_up_days: Optional[int] = 0

class MedicalRecordResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int]
    diagnosis: str
    treatment: str
    prescription: Optional[str]
    created_at: datetime
    patient_name: Optional[str] = None

    class Config:
        from_attributes = True

class PatientListResponse(BaseModel):
    id: int
    full_name: str
    email: str
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    last_visit: Optional[datetime] = None

    class Config:
        from_attributes = True
