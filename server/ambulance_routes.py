from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas, models, auth, ambulance_crud
from database import get_db

router = APIRouter(
    prefix="/ambulance",
    tags=["ambulance"]
)

# Admin endpoints
@router.post("/agencies", response_model=schemas.AmbulanceAgencyResponse)
def create_agency(agency: schemas.AmbulanceAgencyCreate, db: Session = Depends(get_db)):
    return ambulance_crud.create_agency(db=db, agency=agency)

@router.get("/agencies", response_model=List[schemas.AmbulanceAgencyResponse])
def get_agencies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return ambulance_crud.get_agencies(db, skip=skip, limit=limit)

@router.put("/agencies/{agency_id}", response_model=schemas.AmbulanceAgencyResponse)
def update_agency(agency_id: int, agency: schemas.AmbulanceAgencyCreate, db: Session = Depends(get_db)):
    updated = ambulance_crud.update_agency(db, agency_id, agency)
    if not updated:
        raise HTTPException(status_code=404, detail="Agency not found")
    return updated

@router.delete("/agencies/{agency_id}")
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    success = ambulance_crud.delete_agency(db, agency_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agency not found")
    return {"message": "Agency deleted successfully"}

# Agency Unit endpoints
@router.post("/units", response_model=schemas.AmbulanceUnitResponse)
def create_unit(unit: schemas.AmbulanceUnitCreate, db: Session = Depends(get_db)):
    return ambulance_crud.create_unit(db=db, unit=unit)

@router.get("/units/agency/{agency_id}", response_model=List[schemas.AmbulanceUnitResponse])
def get_units_for_agency(agency_id: int, db: Session = Depends(get_db)):
    return ambulance_crud.get_units_by_agency(db, agency_id)

@router.patch("/units/{unit_id}/status", response_model=schemas.AmbulanceUnitResponse)
def update_unit_status(unit_id: int, update_data: dict, db: Session = Depends(get_db)):
    status_val = update_data.get("status")
    lat = update_data.get("current_lat")
    lng = update_data.get("current_lng")
    if not status_val:
        raise HTTPException(status_code=400, detail="Missing status field")
    updated = ambulance_crud.update_unit_status(db, unit_id, status_val, lat, lng)
    if not updated:
        raise HTTPException(status_code=404, detail="Unit not found")
    return updated

# Patient Endpoints
@router.post("/nearby")
def get_nearby_agencies(query: schemas.NearbyAmbulanceQuery, db: Session = Depends(get_db)):
    agencies = ambulance_crud.find_nearby_agencies(db, lat=query.lat, lng=query.lng, radius_km=query.radius_km)
    
    # We dynamically return agency data with extra fields
    result = []
    for ag in agencies:
        ag_dict = schemas.AmbulanceAgencyResponse.from_orm(ag).dict()
        ag_dict["distance_km"] = getattr(ag, "distance_km", None)
        ag_dict["available_units_count"] = getattr(ag, "available_units_count", 0)
        ag_dict["phone_number"] = getattr(ag, "phone_number", None)
        result.append(ag_dict)
    return result

@router.post("/book", response_model=schemas.EmergencyBookingResponse)
def book_ambulance(booking: schemas.EmergencyBookingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    # Fetch the agency to get phone number
    agency = db.query(models.AmbulanceAgency).filter(models.AmbulanceAgency.id == booking.agency_id).first()
    
    # Simple assignment logic: assign first available unit, or leave unit_id null if pending admin assignment
    available_units = db.query(models.AmbulanceUnit).filter(
        models.AmbulanceUnit.agency_id == booking.agency_id,
        models.AmbulanceUnit.status == "Available"
    ).all()
    
    unit_id = None
    if available_units:
        # Book the first one
        unit = available_units[0]
        unit_id = unit.id
        ambulance_crud.update_unit_status(db, unit_id, "On-Trip")
        booking.status = "Active" # Automatically active if assigned
    
    db_booking = ambulance_crud.create_booking(db, booking, patient_id=current_user.id)
    if unit_id:
        db_booking.unit_id = unit_id
        db.commit()
        db.refresh(db_booking)
    
    # Pack the agency_phone into response dict form to match new schema field
    response_data = schemas.EmergencyBookingResponse.from_orm(db_booking).dict()
    response_data["agency_phone"] = getattr(agency, "phone_number", None) if agency else None
        
    return response_data

@router.get("/bookings/agency/{agency_id}", response_model=List[schemas.EmergencyBookingResponse])
def get_agency_bookings(agency_id: int, db: Session = Depends(get_db)):
    return ambulance_crud.get_bookings_by_agency(db, agency_id)

@router.patch("/bookings/{booking_id}/status", response_model=schemas.EmergencyBookingResponse)
def update_booking_status(booking_id: int, update_data: dict, db: Session = Depends(get_db)):
    status_val = update_data.get("status")
    unit_id = update_data.get("unit_id")
    if not status_val:
        raise HTTPException(status_code=400, detail="Missing status field")
    updated = ambulance_crud.update_booking_status(db, booking_id, status_val, unit_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Optional: if completing, free up the unit
    if status_val in ["Completed", "Cancelled"] and updated.unit_id:
        ambulance_crud.update_unit_status(db, updated.unit_id, "Available")
        
    return updated
