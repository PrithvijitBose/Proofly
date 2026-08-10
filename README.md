# Proofly - Connected Professional Identity Platform

Proofly complements traditional resumes with a connected professional identity, linking technical profiles, open-source work, and project accomplishments into a single, shareable profile.

## Project Structure

This workspace is cleanly split into frontend and backend applications:

```text
Proofly/
├── backend/            # FastAPI (Python 3.11+) backend service
│   ├── api/index.py    # Vercel Serverless Function entrypoint
│   ├── app/            # FastAPI source code (routes, schemas, config)
│   ├── vercel.json     # Vercel backend rewrite rules
│   ├── .env.example    # Backend environment configuration template
│   └── requirements.txt # Python dependencies
└── frontend/           # Next.js 15 (TypeScript + Tailwind CSS) client app
    ├── src/            # Next.js App Router source & API client
    ├── vercel.json     # Vercel frontend project configuration
    ├── .env.example    # Frontend environment configuration template
    └── package.json    # Node dependencies
```

---

## Quick Start (Local Development)

### 1. Run Backend Service
```bash
cd backend
python -m venv .venv

# Activate environment:
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
- **Backend Health API**: `http://localhost:8000/api/v1/health`
- **Swagger Documentation**: `http://localhost:8000/docs`

### 2. Run Frontend Application
```bash
cd frontend
npm install
npm run dev
```
- **Frontend Web App**: `http://localhost:3000`

### 3. Authentication & GitHub API Setup

Proofly supports **three authentication models** to accommodate every user and hosting environment:

#### Option A: Standard 1-Click OAuth (Recommended for Production / Web App)
Visitors simply click **"Connect GitHub"**. Proofly securely requests read-only user access via Auth.js v5.
1. Create an OAuth App at [github.com/settings/developers](https://github.com/settings/developers):
   - **Homepage URL**: `https://<your-app-domain>` (or `http://localhost:3000` for local dev)
   - **Authorization callback URL**: `https://<your-app-domain>/api/auth/callback/github`
2. Add environment variables to `frontend/.env.local` (or Vercel Environment Variables):
   ```env
   GITHUB_ID=your_client_id
   GITHUB_SECRET=your_client_secret
   AUTH_SECRET=generate_a_random_secret_here
   AUTH_TRUST_HOST=true
   ```

#### Option B: Personal Access Token (PAT) Input
Users who prefer not to use OAuth or open-source users without an OAuth app can click **"Use PAT"** in the UI and paste a Personal Access Token (`ghp_...` or `github_pat_...`).
- **Required Scopes & Permissions**:
  - **Classic PAT**: `read:user` and `repo` (or `public_repo` for public repositories only).
  - **Fine-Grained PAT**: **Repository permissions** `Metadata: Read-only` (with selected repositories).
- **Private Repositories**: Supported if the token includes `repo` scope or Fine-Grained repository access.
- **Storage**: Token is stored in a persistent 30-day HTTP-only cookie.

#### Option C: Open-Source Self-Hosting
To host your own Proofly deployment:
1. Register a GitHub OAuth App under your own GitHub account (set callback URL to `https://<your-domain>/api/auth/callback/github`).
2. Deploy `frontend` to your server or Vercel.
3. Set `AUTH_TRUST_HOST=true`, `AUTH_SECRET`, `GITHUB_ID`, and `GITHUB_SECRET` in your host environment variables.

Notes:
- The GitHub access token is held in the encrypted Auth.js JWT session cookie and read on the server — it never reaches the browser.
- The journey story is generated deterministically from the GitHub REST API (no third-party AI call required).

---

## Vercel Deployment Guide (Two Vercel Projects)

To ensure high performance, isolated logs, and zero runtime conflicts between Node.js and Python, deploy as **2 separate Vercel projects** linked to the same Git repository.

```
       +----------------------------+
       |   Vercel Project 2         |
       |   (Frontend - Next.js)     |
       |   Root: /frontend          |
       +--------------+-------------+
                      |
           NEXT_PUBLIC_API_BASE_URL
                      |
                      v
       +----------------------------+
       |   Vercel Project 1         |
       |   (Backend - FastAPI)      |
       |   Root: /backend           |
       +----------------------------+
```

### Step 1: Deploy Backend (`/backend`)
1. In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New Project** and import this repository.
2. Under **Root Directory**, click **Edit** and select **`backend`**.
3. Keep Framework Preset as **Other**.
4. Set Environment Variable:
   - `FRONTEND_URL` = `https://<your-frontend-domain>.vercel.app` (Supports multiple comma-separated URLs for preview/production domains).
5. Click **Deploy**. Note your deployed backend URL (e.g. `https://proofly-backend.vercel.app`).

### Step 2: Deploy Frontend (`/frontend`)
1. Click **Add New Project** again and import this repository.
2. Under **Root Directory**, click **Edit** and select **`frontend`**.
3. Ensure Framework Preset is **Next.js**.
4. Set Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://proofly-backend.vercel.app` (URL from Step 1).
5. Click **Deploy**. Your app is now live!

### How Backend & Frontend Connect Dynamic Updates:
- **API Requests**: The frontend uses `NEXT_PUBLIC_API_BASE_URL` configured in `src/config/env.ts` to direct all client-side and server-side requests to the backend service.
- **CORS Handling**: Backend's `app/config.py` automatically parses `FRONTEND_URL` (supporting comma-separated values for local development, production domains, and preview deployments).
- **Backend Changes**: When a developer adds new FastAPI routes, endpoints, or settings in `backend/app/`, Vercel automatically deploys them via serverless functions. Frontend developers simply reference `NEXT_PUBLIC_API_BASE_URL` without code refactoring.
