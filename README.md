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

### 3. Authentication Models & Deployment Guide

Proofly supports **three distinct authentication models** tailored for general end-users, open-source contributors, and self-hosting organizations:

#### 🟢 Option A: 1-Click OAuth (For End-Users)
* **Who it is for**: General visitors using your live hosted web application (`proofly-omega.vercel.app`).
* **User Experience**: Visitors simply click **"AUTHENTICATE GITHUB"** and authorize Proofly.
* **Setup Required from End-Users**: **ZERO**. End-users do not create OAuth Apps or manage environment variables.
* **Security**: Access tokens are held in an encrypted Auth.js JWT session cookie (`HttpOnly`) and read strictly server-side.

#### 🟡 Option B: Personal Access Token / PAT Input (For Open-Source Contributors)
* **Who it is for**: Open-source contributors cloning Proofly to test, develop, or submit PRs locally **without creating a GitHub OAuth App**.
* **Why this exists**: Contributors don't need to register an OAuth App just to run `npm run dev`. They can sign in immediately using a Personal Access Token.
* **How Contributors Get a PAT**:
  1. Go to GitHub -> **Settings** -> **Developer Settings** -> **Personal Access Tokens**.
  2. Click **Generate new token (classic)** or **Fine-grained token**.
  3. Grant required scopes:
     - **Classic PAT**: `read:user` and `repo` (or `public_repo` for public repositories only).
     - **Fine-Grained PAT**: **Repository permissions** `Metadata: Read-only`.
  4. Copy the generated token starting with `ghp_...` or `github_pat_...`.
* **How Contributors Use It**:
  - Open `http://localhost:3000`, click **"Use PAT"**, paste the token, and click **Save**.
  - Token is securely saved in a persistent 30-day HTTP-only cookie (`proofly_pat_token`).

#### 🔵 Option C: Self-Hosting & Custom Deployments (For Businesses & Self-Hosters)
* **Who it is for**: Companies, teams, or independent developers deploying their own custom/private instance of Proofly (e.g., on Vercel, AWS, or Railway).
* **Step-by-Step Setup**:
  1. **Register a GitHub OAuth App**:
     - Go to GitHub -> **Developer Settings** -> **OAuth Apps** -> **New OAuth App**.
     - **Homepage URL**: `https://<your-custom-frontend-domain>`
     - **Authorization callback URL**: `https://<your-custom-frontend-domain>/api/auth/callback/github`
  2. **Deploy `/backend` (Python FastAPI)**:
     - Deploy the `backend/` directory to Vercel, Railway, or Render.
     - Note your backend deployment URL (e.g. `https://proofly-api.railway.app`).
  3. **Deploy `/frontend` (Next.js)**:
     - Deploy the `frontend/` directory to Vercel or a Node.js server.
     - Set the following environment variables in your frontend host environment:
       ```env
       # OAuth Credentials (from step 1)
       GITHUB_ID=your_github_client_id
       GITHUB_SECRET=your_github_client_secret

       # NextAuth Security
       AUTH_SECRET=generate_a_random_32_char_secret
       AUTH_TRUST_HOST=true

       # Backend API Link
       NEXT_PUBLIC_API_BASE_URL=https://<your-backend-domain>
       ```

Notes:
- **Cookies & Security**: Authentication uses two HTTP-only cookies stored in the browser and sent with server requests:
  - **Auth.js Session Cookie** (`authjs.session-token` / `__Secure-authjs.session-token`): Holds the encrypted OAuth JWT.
  - **PAT Cookie** (`proofly_pat_token`): Holds custom Personal Access Tokens for PAT sign-ins.
  - Both cookies use `HttpOnly` to prevent client-side JavaScript access (`document.cookie`). Access tokens are read server-side and are never serialized into the client-visible session object.
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
