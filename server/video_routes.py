from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
from database import get_db
import models, video_schemas, auth, appointment_models
import uuid
import json
from datetime import datetime, timedelta

def add_remaining_seconds(session):
    if session and session.status == "active":
        diff = (datetime.utcnow() - session.started_at).total_seconds()
        session.remaining_seconds = max(0, int(30 - diff))
    else:
        session.remaining_seconds = 0
    
    # Attach patient_id from the linked token
    if session and hasattr(session, 'token') and session.token:
        session.patient_id = session.token.patient_id
    elif session and session.token_id:
        # Fallback if relationship not loaded
        from sqlalchemy.orm import object_session
        db = object_session(session)
        if db:
            token = db.query(appointment_models.Token).filter(appointment_models.Token.id == session.token_id).first()
            if token:
                session.patient_id = token.patient_id

    return session

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, message: str, session_id: str, sender: WebSocket):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                if connection != sender:
                    await connection.send_text(message)

    async def broadcast_all(self, message: str, session_id: str):
        """Broadcast to ALL connections in a session, including the sender."""
        if session_id in self.active_connections:
            dead = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead.append(connection)
            for d in dead:
                self.active_connections[session_id].remove(d)

manager = ConnectionManager()

router = APIRouter(prefix="/video", tags=["video"])

@router.post("/session", response_model=video_schemas.VideoSessionResponse)
async def create_video_session(
    session_create: video_schemas.VideoSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Get the token
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.id == session_create.token_id
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    # Verify access
    if current_user.role == "patient" and token.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "doctor" and token.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if session already exists
    existing_session = db.query(appointment_models.VideoSession).filter(
        appointment_models.VideoSession.token_id == session_create.token_id,
        appointment_models.VideoSession.status == "active"
    ).first()
    
    if existing_session:
        # Check if it's stale (older than 40 seconds)
        if (datetime.utcnow() - existing_session.started_at).total_seconds() > 40:
            existing_session.status = "ended"
            existing_session.ended_at = datetime.utcnow()
            db.commit()
        else:
            return add_remaining_seconds(existing_session)
    
    # Create new session
    session_id = str(uuid.uuid4())
    new_session = appointment_models.VideoSession(
        token_id=session_create.token_id,
        session_id=session_id,
        status="active"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return add_remaining_seconds(new_session)

@router.get("/session/{session_id}", response_model=video_schemas.VideoSessionResponse)
async def get_video_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    session = db.query(appointment_models.VideoSession).filter(
        appointment_models.VideoSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify access
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.id == session.token_id
    ).first()
    
    if current_user.role == "patient" and token.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "doctor" and token.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return add_remaining_seconds(session)

@router.put("/session/{session_id}/end")
async def end_video_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    session = db.query(appointment_models.VideoSession).filter(
        appointment_models.VideoSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify access
    token = db.query(appointment_models.Token).filter(
        appointment_models.Token.id == session.token_id
    ).first()
    
    if current_user.role == "patient" and token.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "doctor" and token.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    session.status = "ended"
    session.ended_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)

    # Broadcast end to ALL participants (including caller) so everyone disconnects
    await manager.broadcast_all(json.dumps({"type": "end"}), session_id)

    return session
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast the received message to other participants in the same session
            await manager.broadcast(data, session_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@router.get("/incoming-call", response_model=video_schemas.VideoSessionResponse)
async def check_incoming_call(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Remove restriction - doctors should also be able to receive notifications (e.g. SOS)
    # if current_user.role != "patient":
    #     raise HTTPException(status_code=403, detail="Only patients can check for incoming calls")
    
    # Check for ACTIVE video sessions linked to tokens owned by this patient OR assigned to this doctor
    # We join with Token to verify the patient ownership
    # We assume 'active' session means the doctor is waiting/calling.
    # Logic: If a session is ACTIVE and the user hasn't joined yet (or even if they have, we redirect),
    # but strictly speaking, we want to know if a doctor initiated a session.
    
    current_time = datetime.utcnow()
    print(f"[DEBUG] Incoming call check for user {current_user.id} at {current_time} UTC")
    from datetime import timedelta
    time_limit = current_time - timedelta(seconds=40)
    print(f"[DEBUG] Time limit for session: {time_limit} UTC")
    
    filters = [
        appointment_models.VideoSession.status == "active",
        appointment_models.VideoSession.started_at >= time_limit
    ]
    
    # Handle role-based filters safely
    role_str = str(current_user.role).lower()
    if "patient" in role_str:
        filters.append(appointment_models.Token.patient_id == current_user.id)
    else:
        filters.append(appointment_models.Token.doctor_id == current_user.id)
    
    session = db.query(appointment_models.VideoSession).join(
        appointment_models.Token, appointment_models.Token.id == appointment_models.VideoSession.token_id
    ).filter(*filters).order_by(appointment_models.VideoSession.started_at.desc()).first()

    if session:
        print(f"[DEBUG] FOUND active session {session.session_id} started at {session.started_at}")
    else:
        print(f"[DEBUG] No active session found recently for patient {current_user.id}")

    if not session:
        raise HTTPException(status_code=404, detail="No incoming call")
        
    return add_remaining_seconds(session)
