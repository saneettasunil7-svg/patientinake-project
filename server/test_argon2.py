from passlib.context import CryptContext
import sys

try:
    pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
    password = "admin123"
    hashed = pwd_context.hash(password)
    print(f"Hashed: {hashed}")
    verified = pwd_context.verify(password, hashed)
    print(f"Verified: {verified}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
