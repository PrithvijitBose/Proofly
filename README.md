# Proofly - Connected Professional Identity Platform

Proofly complements traditional resumes with a connected professional identity, linking technical profiles, open-source work, and project accomplishments into a single, shareable profile.

## Project Structure

This workspace is cleanly split into frontend and backend applications:

```text
Proofly/
├── backend/            # FastAPI (Python 3.11+) backend service
│   ├── app/            # Application source code
│   ├── .env.example    # Backend environment template
│   └── requirements.txt # Python dependencies
└── frontend/           # Next.js (TypeScript + Tailwind CSS) client app
    ├── src/            # Next.js App Router source
    ├── .env.example    # Frontend environment template
    └── package.json    # Node dependencies
```

## Quick Start

### 1. Run Backend Service
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Backend Health API will be live at: `http://localhost:8000/api/v1/health`
Interactive API Docs (Swagger): `http://localhost:8000/docs`

### 2. Run Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Frontend Web App will be live at: `http://localhost:3000`

---
*Boilerplate architecture designed for extensibility and modular growth.*
