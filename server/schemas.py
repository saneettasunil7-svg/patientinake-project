from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    doctor = "doctor"
    patient = "patient"
    agency = "agency"

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole
    full_name: str # Helper to create profile immediately
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    # specific fields could be added as optional here
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    profile_photo: Optional[str] = None


    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class AmbulanceAgencyBase(BaseModel):
    name: str
    license_number: str
    region: str
    phone_number: Optional[str] = None
    is_verified: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    manager_id: Optional[int] = None

class AmbulanceAgencyCreate(AmbulanceAgencyBase):
    pass

class AmbulanceAgencyResponse(AmbulanceAgencyBase):
    id: int

    class Config:
        from_attributes = True

class AmbulanceUnitBase(BaseModel):
    driver_name: str
    phone_number: str
    vehicle_plate: str
    status: str = "Offline"
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None

class AmbulanceUnitCreate(AmbulanceUnitBase):
    agency_id: int

class AmbulanceUnitResponse(AmbulanceUnitBase):
    id: int
    agency_id: int

    class Config:
        from_attributes = True

class EmergencyBookingBase(BaseModel):
    agency_id: int
    patient_lat: float
    patient_lng: float
    status: str = "Pending"

class EmergencyBookingCreate(EmergencyBookingBase):
    pass

class EmergencyBookingResponse(EmergencyBookingBase):
    id: int
    patient_id: int
    unit_id: Optional[int] = None
    timestamp: str
    agency_phone: Optional[str] = None

    class Config:
        from_attributes = True

class NearbyAmbulanceQuery(BaseModel):
    lat: float
    lng: float
    radius_km: float = 20.0

class PublicBookingRequest(BaseModel):
    # Patient info
    first_name: str
    last_name: str
    dob: str
    gender: str
    blood_group: Optional[str] = None
    mobile: str
    email: EmailStr
    password: str
    # Appointment info
    speciality: str
    doctor_id: int
    appointment_date: str  # ISO date string e.g. "2026-03-15"
    # Bank Details
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr
    new_password: str
    confirm_password: str
