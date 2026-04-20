from sqlalchemy.orm import Session
import models
from datetime import datetime

def log_admin_action(db: Session, user_id: int, action: str, details: str):
    """
    Logs an admin action to the database.
    """
    try:
        new_log = models.AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            timestamp=datetime.utcnow().isoformat()
        )
        db.add(new_log)
        db.commit()
    except Exception as e:
        print(f"Failed to log action: {e}")
