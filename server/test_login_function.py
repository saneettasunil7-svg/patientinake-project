import os
import sys
import traceback

sys.path.append(os.getcwd())

from database import SessionLocal
import models
import schemas
from pydantic import ValidationError

db = SessionLocal()

print("Testing Pydantic serialization for shibis@gmail.com...")
try:
    email_query = "shibis@gmail.com".strip().lower()
    user = db.query(models.User).filter(models.User.email.ilike(email_query)).first()
    
    if not user:
        print("User not found in DB")
    else:
        print(f"User found: {user.email}")
        
        # Test UserResponse serialization
        print("Attempting to parse into UserResponse...")
        user_response = schemas.UserResponse.model_validate(user)
        print("Successfully parsed UserResponse!")
        
        # Test full Token serialization
        print("Attempting to parse into Token...")
        token_data = {
            "access_token": "fake_token",
            "token_type": "bearer",
            "user": user_response
        }
        token_response = schemas.Token.model_validate(token_data)
        print("Successfully parsed Token!")
        
except ValidationError as e:
    print("Pydantic Validation Error caught!")
    print(e)
except Exception as e:
    print("Other Exception during serialization:")
    traceback.print_exc()

finally:
    db.close()
