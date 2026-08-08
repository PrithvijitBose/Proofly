# Proofly Backend Service

FastAPI-powered backend service using Pydantic Settings for type-safe environment configuration.

## Setup & Running

1. Create a virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run development server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
- Health API: `http://localhost:8000/api/v1/health`
- OpenAPI Swagger UI: `http://localhost:8000/docs`
