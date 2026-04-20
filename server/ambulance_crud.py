import math
from sqlalchemy.orm import Session
from sqlalchemy import or_
import models
import schemas
from typing import List, Optional

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Agency Operations
def create_agency(db: Session, agency: schemas.AmbulanceAgencyCreate):
    db_agency = models.AmbulanceAgency(**agency.dict())
    db.add(db_agency)
    db.commit()
    db.refresh(db_agency)
    return db_agency

def get_agencies(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.AmbulanceAgency).offset(skip).limit(limit).all()

def update_agency(db: Session, agency_id: int, agency: schemas.AmbulanceAgencyCreate):
    db_agency = db.query(models.AmbulanceAgency).filter(models.AmbulanceAgency.id == agency_id).first()
    if db_agency:
        for key, value in agency.dict().items():
            setattr(db_agency, key, value)
        db.commit()
        db.refresh(db_agency)
    return db_agency

def delete_agency(db: Session, agency_id: int):
    db_agency = db.query(models.AmbulanceAgency).filter(models.AmbulanceAgency.id == agency_id).first()
    if db_agency:
        db.delete(db_agency)
        db.commit()
        return True
    return False

# Unit Operations
def create_unit(db: Session, unit: schemas.AmbulanceUnitCreate):
    db_unit = models.AmbulanceUnit(**unit.dict())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

def get_units_by_agency(db: Session, agency_id: int):
    return db.query(models.AmbulanceUnit).filter(models.AmbulanceUnit.agency_id == agency_id).all()

def update_unit_status(db: Session, unit_id: int, status: str, lat: Optional[float] = None, lng: Optional[float] = None):
    db_unit = db.query(models.AmbulanceUnit).filter(models.AmbulanceUnit.id == unit_id).first()
    if db_unit:
        db_unit.status = status
        if lat is not None:
            db_unit.current_lat = lat
        if lng is not None:
            db_unit.current_lng = lng
        db.commit()
        db.refresh(db_unit)
    return db_unit

# Booking Operations
def create_booking(db: Session, booking: schemas.EmergencyBookingCreate, patient_id: int):
    db_booking = models.EmergencyBooking(**booking.dict(), patient_id=patient_id)
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

def get_bookings_by_agency(db: Session, agency_id: int):
    return db.query(models.EmergencyBooking).filter(models.EmergencyBooking.agency_id == agency_id).order_by(models.EmergencyBooking.id.desc()).all()

def update_booking_status(db: Session, booking_id: int, status: str, unit_id: Optional[int] = None):
    db_booking = db.query(models.EmergencyBooking).filter(models.EmergencyBooking.id == booking_id).first()
    if db_booking:
        db_booking.status = status
        if unit_id is not None:
            db_booking.unit_id = unit_id
        db.commit()
        db.refresh(db_booking)
    return db_booking

def find_nearby_agencies(db: Session, lat: float, lng: float, radius_km: float = 20.0):
    agencies = db.query(models.AmbulanceAgency).filter(models.AmbulanceAgency.is_verified == True).all()
    nearby = []
    
    for agency in agencies:
        if agency.latitude is not None and agency.longitude is not None:
            dist = haversine(lat, lng, agency.latitude, agency.longitude)
            if dist <= radius_km:
                # Include distance for sorting or frontend display
                # We can return a dict or augment the object.
                setattr(agency, "distance_km", dist) 
                
                # Check for available units
                available_units = db.query(models.AmbulanceUnit).filter(
                    models.AmbulanceUnit.agency_id == agency.id,
                    models.AmbulanceUnit.status == "Available"
                ).count()
                setattr(agency, "available_units_count", available_units)
                
                nearby.append(agency)
    
    # Sort by distance
    nearby.sort(key=lambda x: getattr(x, "distance_km", 999))
    return nearby
