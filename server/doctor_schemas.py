from pydantic import BaseModel
from typing import Optional, List
from datetime import time, datetime

class DoctorProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    specialization: str
    bio: Optional[str] = None
    email: str  # From User table
    phone_number: Optional[str] = None
    profile_photo: Optional[str] = None
    is_available: bool = False
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None

    class Config:
        from_attributes = True

class DoctorProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None

class DoctorListResponse(BaseModel):
    id: int  # User ID
    email: str
    full_name: Optional[str]
    specialization: Optional[str]
    is_available: bool = False
    profile_photo: Optional[str] = None

    class Config:
        from_attributes = True

class DoctorScheduleBase(BaseModel):
    day_of_week: int
    start_time: str # Input can be string "HH:MM"
    end_time: str
    is_active: bool = True

class DoctorScheduleCreate(DoctorScheduleBase):
    pass

class DoctorScheduleResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: int
    start_time: time
    end_time: time
    is_active: bool

    class Config:
        from_attributes = True

class UnavailableDaysUpdate(BaseModel):
    unavailable_days: List[int]
    unavailable_dates: Optional[List[str]] = None

class DailyReportItem(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    type: str  # 'appointment' or 'walk_in'
    time_str: str  # HH:MM format
    status: str
    notes: Optional[str] = None
    created_at: datetime
    is_emergency: bool = False

    class Config:
        from_attributes = True

class DoctorDailyReportResponse(BaseModel):
    date: str
    total_patients: int
    total_appointments: int
    total_walk_ins: int
    total_emergencies: int
    avg_wait_minutes: int
    items: List[DailyReportItem]
