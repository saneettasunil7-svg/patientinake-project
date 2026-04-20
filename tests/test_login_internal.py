from main import app
from database import SessionLocal
import models
import auth
import schemas
from fastapi.security import OAuth2PasswordRequestForm
from unittest.mock import MagicMock
import asyncio

async def test_login_internal(email):
    db = SessionLocal()
    try:
        print(f"Testing internal login for: {email}")
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print("User not found.")
            return

        # Mock form data
        form_data = MagicMock(spec=OAuth2PasswordRequestForm)
        form_data.username = email
        form_data.password = "wrong-password" # We just want to see if it reaches verify_password or fails before

        # We will manually call the login logic to see where it breaks
        print("Checking password...")
        # Note: We can't actually verify without the real password, 
        # but let's see if the serialization at the end is the problem.
        
        # Simulate successful auth for testing serialization
        access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
        )
        
        response = {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": user
        }
        
        print("Validating response with Pydantic...")
        token_schema = schemas.Token(**response)
        print("Serialization successful!")
        print(token_schema.model_dump())

    except Exception as e:
        print(f"FAILED with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_login_internal("neyon@gmail.com"))
