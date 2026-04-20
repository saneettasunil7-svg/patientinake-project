import os
import sys
import traceback
import asyncio

sys.path.append(os.getcwd())

from database import SessionLocal
import models
import auth
import schemas

db = SessionLocal()

async def test_auth():
    print("Testing auth for shibis@gmail.com...")
    try:
        user = db.query(models.User).filter(models.User.email == "shibis@gmail.com").first()
        access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
        )
        
        # Now simulate get_current_active_user
        print("Calling get_current_active_user...")
        # get_current_user is async
        current_user = await auth.get_current_user(token=access_token, db=db)
        print(f"Decoded User: {current_user.email}")
        
        # then active check
        active_user = await auth.get_current_active_user(current_user=current_user)
        print(f"Active User: {active_user.email}")
        
    except Exception as e:
        print("Exception in auth:")
        traceback.print_exc()
    finally:
        db.close()

asyncio.run(test_auth())
