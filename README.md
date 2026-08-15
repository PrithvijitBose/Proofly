<div align="center">

# ⚡ Proofly

**Your Code is Your Resume. Grounded in Evidence, Powered by AI.**

*Transform raw GitHub activity, merged pull requests, and system architectures into a living, verified career narrative.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Mistral AI](https://img.shields.io/badge/Mistral_AI-2506-FD6F00?style=for-the-badge&logo=mistral&logoColor=white)](https://mistral.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[🌐 **Live Demo**](https://proofly-omega.vercel.app) 

</div>

---

## The problem

| 📄 Traditional Resumes & Portfolios | ⚡ Proofly Connected Identity |
| :--- | :--- |
| **Static & Stale**: Frozen in time as PDF bullet points. | **Living & Dynamic**: Automatically syncs with verified GitHub activity. |
| **Unverifiable Claims**: Anyone can list buzzwords. | **Evidence-Grounded**: Every milestone links directly to real commits & PRs. |
| **Scattered History**: Work is fragmented across repos. | **Synthesized Story**: Chronological, AI-crafted career milestones with tone presets. |
| **Black-Box Architecture**: Recruiters can't gauge depth. | **Deep Inspection**: Star metrics, LOC impact, and architectural complexity graphs. |

> *"Software engineers build remarkable systems, yet the hiring industry still evaluates them on 1-page PDFs. Proofly bridges the gap between what you actually built and how your career is told."*

---

## What Proofly is

https://github.com/user-attachments/assets/a37c33ec-1eec-48b4-ab73-567efc22150e

Proofly is an open-source platform that analyzes your curated software projects and automatically synthesizes a **chronological, evidence-backed career narrative**.


### ✨ Core Pillars

*  **Evidence Grounding**: Every accomplishment claim is backed by immutable Git commit hashes, PR references, or repository metrics.
*  **7 Dynamic Tone Presets**: Switch instantly between *Technical Lead*, *Concise*, *Storytelling*, *Recruiter-Friendly*, *Professional*, *Personal*, or *Casual*.
*  **In-Place Story Studio**: Full creative control to edit chapter titles, modify impact claims, or re-order milestones with instant local persistence.
*  **Zero-Hallucination Guardrails**: Prompts strictly reject speculative claims; an automatic rule-based offline fallback kicks in if upstream AI is rate-limited.
*  **@Knowledge Bot**: An embedded engineering context agent that explains codebase architecture and onboarding flows in GitHub PRs and Issues.




---

## What exists today

### 🔐 1. Multi-Tier Authentication Architecture

Proofly is engineered to eliminate onboarding friction for every type of user:

```
                      ┌─────────────────────────────────────────────────────────┐
                      │              CHOOSE YOUR ACCESS MODEL                   │
                      └────────────────────────────┬────────────────────────────┘
                                                   │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌───────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│ 🟢 END USERS      │             │ 🟡 CONTRIBUTORS   │             │ 🔵 BUSINESS/SELF  │
│ 1-Click OAuth     │             │ PAT Fast-Track    │             │ Dedicated Hosting │
│ Zero-Config Login │             │ No OAuth App Req. │             │ Custom Domain/App │
└───────────────────┘             └───────────────────┘             └───────────────────┘
```

| Tier | Who It's For | Setup Required | Security Model |
| :--- | :--- | :--- | :--- |
| 🟢 **1-Click OAuth** | Visitors on hosted web app | **Zero setup** (Click and authorize) | `HttpOnly` Auth.js encrypted JWT cookie |
| 🟡 **PAT Fast-Track** | Open-source contributors & testers | Paste GitHub Token (`ghp_...`) | Secure 30-day `proofly_pat_token` cookie |
| 🔵 **Self-Hosted** | Teams, enterprises & custom hosts | Register GitHub OAuth App | Full custom environment isolation |

<details>
<summary><b>🛠️ Click here for Business & Self-Hosting Configuration Details</b></summary>

1. **Register a GitHub OAuth App**:
   * Set Authorization Callback URL: `https://<your-domain>/api/auth/callback/github`
2. **Configure Frontend Environment Variables**:
   ```env
   GITHUB_ID=your_github_client_id
   GITHUB_SECRET=your_github_client_secret
   AUTH_SECRET=generate_a_random_32_char_secret
   AUTH_TRUST_HOST=true
   NEXT_PUBLIC_API_BASE_URL=https://<your-backend-domain>
   ```
3. **Deploy Backend**: Deploy `/backend` (FastAPI) to Railway, Render, or Vercel with `FRONTEND_URL` configured for CORS.
</details>

---

###  2. Intelligent Curation & AI Story Engine

* **Smart Repo Extraction**: Automatically pulls language distributions, commit frequencies, stars, and PR contributions.
* **Mistral AI Synthesis**: Transforms complex engineering work into crisp chronological milestones with structured takeaways.
* **Deterministic Fallback Engine**: If Mistral AI experiences rate limits (`429`), Proofly's offline heuristic engine immediately generates a clean, rule-grounded timeline.

---

###  3. Interactive Narrative Studio & Evidence Graph

* **Live In-Place Editing**: Edit chapters, re-word impact statements, and tailor claims to your exact persona.
* **Verifiable Evidence Drawer**: Deep-link directly into immutable GitHub source files, merged PRs, and commit diffs.
* **Local Persistence**: Save your approved identity narrative so it remains your default public representation.

---

###  4. `@Knowledge` Contributor Onboarding Bot

* Triggered automatically via `@Knowledge` or `@knowledge` comments on GitHub Issues & PRs.
* Investigates the codebase to construct mental models, highlight entry points, and explain system relationships rather than giving generic advice.

---

## How to contribute

Whether you are fixing a typo, adding a new tone preset, or optimizing our LLM prompts—contributions are warmly welcomed!

### ⚡ Quick Start in 3 Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/PrithvijitBose/Proofly.git
cd Proofly
```

#### 2. Start the Backend Service (FastAPI)
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux: source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
> API Health: `http://localhost:8000/api/v1/health` • Swagger: `http://localhost:8000/docs`

#### 3. Start the Frontend Client (Next.js 15)
```bash
cd frontend
npm install
npm run dev
```
> Web Application: `http://localhost:3000`

---

### 🧪 Running Tests
```bash
cd frontend
npm test
```

---

### 🌿 Contribution Workflow
1. Create a feature branch: `git checkout -b feature/awesome-feature`
2. Commit with conventional commit messages: `git commit -m "feat(journey): add markdown export button"`
3. Verify test suite passes: `npm test`
4. Open a Pull Request on GitHub.

---


## Community / Discord

Connect with fellow contributors, suggest features, and get live help:

<div align="center">

[![Discord](https://img.shields.io/badge/Discord-Join_Community-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/XkvEYcEba)


</div>

---

## License

Proofly is open-source software licensed under the **[MIT License](LICENSE)**.

```text
Copyright (c) 2026 Proofly Contributors
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files...
```
*(See full license text in [LICENSE](LICENSE))*
