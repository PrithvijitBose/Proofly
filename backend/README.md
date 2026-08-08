# Proofly Backend Service

FastAPI-powered backend service using Pydantic Settings for type-safe environment configuration. Built for seamless deployment on Vercel Serverless Python runtime.

## Setup & Local Development

1. Create a virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/macOS
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables (optional):
```bash
cp .env.example .env
```

4. Run development server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
- Health API: `http://localhost:8000/api/v1/health`
- OpenAPI Swagger UI: `http://localhost:8000/docs`

---

## Deploying to Vercel (Project 1: Backend)

This backend is configured for serverless execution via `api/index.py` and `vercel.json`.

### Steps to Deploy:
1. Push your changes to Git (GitHub / GitLab / Bitbucket).
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New Project**.
3. Import this repository.
4. Set **Root Directory** to `backend`.
5. Keep Framework Preset as **Other** (Vercel automatically detects Python via `api/index.py` and `requirements.txt`).
6. Set **Environment Variables**:
   - `FRONTEND_URL`: `https://<your-frontend-vercel-domain>.vercel.app` (supports comma-separated URLs if you have multiple preview/production domains).
7. Click **Deploy**.

Vercel will output your backend domain (e.g. `https://proofly-backend.vercel.app`).
- `/docs` will serve the Swagger documentation.
- `/api/v1/health` will serve the health check endpoint.
