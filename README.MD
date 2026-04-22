# OmniML 🤖

An open-source AutoML platform built for developers and indie hackers.

Upload a CSV → AI agents clean your data, select the best model, tune it, and explain it → Deploy as a live REST API in one click.

---

## What it does

- Upload any CSV dataset
- Automatically detects problem type (classification or regression)
- Tries multiple ML models and picks the best one
- Explains predictions in plain English using SHAP
- Deploys your trained model as a callable REST API
- Marketplace to share and discover public models

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| Database | PostgreSQL (Supabase) |
| Cache / Queue | Redis (Upstash) |
| Background Jobs | Celery |
| ML Engine | scikit-learn, XGBoost, LightGBM, SHAP |
| AI Agents | LangGraph, LangChain |
| Payments | Razorpay |
| Deployment | Docker, Render, Vercel |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### Run locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/omniml.git
cd omniml

# Add your environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Start everything
docker-compose up --build
```

API will be live at `http://localhost:8000`

API docs at `http://localhost:8000/docs`

---

## Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
DATABASE_URL=postgresql://omniml_user:omniml_pass@db:5432/omniml_db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## Project Structure