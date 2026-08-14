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

## Journey Narrative Generation (AI)

The journey page (`/journey`) writes your curated GitHub history as a story. It works in two
tiers:

- **Deterministic story** — always available. Derived entirely from GitHub data (commits, PRs,
  issues, events, languages) with zero AI involvement. This is what you see instantly while the
  AI narrative generates, and it is the labeled fallback whenever the AI path is unavailable.
- **AI narrative** (optional) — an LLM writes prose chapters from the same evidence. Every claim
  the model makes must cite real evidence records (shown as citation chips), and a deterministic
  guardrail pass runs server-side before anything is returned: claims citing unknown evidence or
  sharing no content with their citations are dropped, claims whose numbers/repos/languages/years
  don't match the cited evidence are flagged "needs verification", and any chapter with zero
  grounded claims is replaced by an evidence-derived summary. Raw LLM text never reaches the UI.

### Configuration

| Variable         | Required | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `MISTRAL_API_KEY`| No       | Mistral API key (https://console.mistral.ai). Without it the journey page shows the deterministic story — no errors. |
| `MISTRAL_MODEL`  | No       | Override the default model (`mistral-small-2506`).                 |

Copy the template and add your key:

```bash
cp .env.example .env.local   # then set MISTRAL_API_KEY
```

### Scope & privacy

- The AI narrative is generated **only** from the repositories you curate on `/projects`
  (stored in your browser's localStorage; the server reads them by name and gathers evidence
  with your server-side GitHub token — the token never leaves the server).
- Only normalized, truncated evidence excerpts are sent to the Mistral API — no raw GitHub
  objects, no token, no personal data beyond your public GitHub history.
- Guardrail verdicts drive the UI: "X claims verified against GitHub evidence" and the
  evidence panel's "X of Y claims verified" summary line.

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
