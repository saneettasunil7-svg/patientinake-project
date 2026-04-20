from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, chat_schemas, auth
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/send", response_model=chat_schemas.MessageResponse)
async def send_message(
    message: chat_schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Verify receiver exists
    receiver = db.query(models.User).filter(models.User.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    new_message = models.Message(
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content,
        timestamp=datetime.now().isoformat(),
        is_read=False
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message

@router.get("/history/{user_id}", response_model=List[chat_schemas.MessageResponse])
async def get_chat_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Fetch messages between current_user and target user_id
    messages = db.query(models.Message).filter(
        (
            (models.Message.sender_id == current_user.id) & 
            (models.Message.receiver_id == user_id)
        ) | (
            (models.Message.sender_id == user_id) & 
            (models.Message.receiver_id == current_user.id)
        )
    ).order_by(models.Message.timestamp.asc()).all()
    
    # Mark messages as read if current_user is receiver
    for msg in messages:
        if msg.receiver_id == current_user.id and not msg.is_read:
            msg.is_read = True
    db.commit()
    
    return messages

@router.get("/contacts")
async def get_chat_contacts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Find all unique user_ids that current_user has exchanged messages with
    sender_ids = db.query(models.Message.sender_id).filter(models.Message.receiver_id == current_user.id).distinct().all()
    receiver_ids = db.query(models.Message.receiver_id).filter(models.Message.sender_id == current_user.id).distinct().all()
    
    unique_ids = set([r[0] for r in sender_ids] + [r[0] for r in receiver_ids])
    
    contacts = []
    for uid in unique_ids:
        user = db.query(models.User).filter(models.User.id == uid).first()
        if not user:
            continue
            
        profile = None
        if user.role == "patient":
            profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == uid).first()
        elif user.role == "doctor":
            profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == uid).first()
            
        contacts.append({
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": profile.full_name if profile else user.email.split('@')[0]
        })
        
    return contacts

