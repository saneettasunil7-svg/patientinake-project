from passlib.context import CryptContext
import sys

try:
    print("Initializing CryptContext...")
    pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
    password = "testpassword"
    print("Hashing password...")
    hashed = pwd_context.hash(password)
    print(f"Hashed: {hashed}")
    print("Verifying password...")
    verified = pwd_context.verify(password, hashed)
    print(f"Verified: {verified}")
except Exception as e:
    print(f"Caught exception: {e}")
except BaseException as e:
    print(f"Caught base exception: {e}")
print("Done.")
