from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, datasets, deployment, payments
from app.core.database import engine, Base
from app.models import user, dataset, job, deployed_model, payment

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MLFoundry API",
    description="AutoML Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(deployment.router)
app.include_router(payments.router)

@app.get("/")
def health_check():
    return {"status": "MLFoundry API is running 🚀"}