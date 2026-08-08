# Proofly Frontend Application

Next.js (App Router) + React + TypeScript + Tailwind CSS application boilerplate connected to the Proofly FastAPI Backend.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment template:
```bash
cp .env.example .env.local
```

3. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## Deploying to Vercel (Project 2: Frontend)

### Steps to Deploy:
1. Push your changes to Git.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New Project**.
3. Import this repository.
4. Set **Root Directory** to `frontend`.
5. Ensure Framework Preset is set to **Next.js**.
6. Set **Environment Variables**:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://<your-backend-vercel-domain>.vercel.app` (URL of your deployed backend).
7. Click **Deploy**.
