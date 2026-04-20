from sqlalchemy.orm import Session
from database import SessionLocal
import models
import auth

def create_test_admin():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(models.User).filter(models.User.email == "admin@clinic.com").first()
        
        if admin:
            print(f"✅ Admin already exists: admin@clinic.com")
            print(f"   ID: {admin.id}")
            print(f"   Role: {admin.role}")
            print(f"   Active: {admin.is_active}")
            
            # Update password to known value
            admin.hashed_password = auth.get_password_hash("admin123")
            db.commit()
            print(f"✅ Password reset to: admin123")
        else:
            # Create new admin
            new_admin = models.User(
                email="admin@clinic.com",
                hashed_password=auth.get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            print(f"✅ Created new admin account:")
            print(f"   Email: admin@clinic.com")
            print(f"   Password: admin123")
            print(f"   ID: {new_admin.id}")
        
        print("\n" + "="*60)
        print("LOGIN CREDENTIALS:")
        print("="*60)
        print("Email: admin@clinic.com")
        print("Password: admin123")
        print("="*60)
        
    finally:
        db.close()

if __name__ == "__main__":
    create_test_admin()
