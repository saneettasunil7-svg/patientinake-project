import sys
import traceback
try:
    import main
    print("Main imported successfully")
except Exception as e:
    traceback.print_exc()
