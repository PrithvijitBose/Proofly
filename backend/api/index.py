import sys
from pathlib import Path

# Add backend directory to Python path so app modules can be imported by Vercel Serverless Function
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.main import app

# Export FastAPI instance as `app` for Vercel ASGI runner
__all__ = ["app"]
