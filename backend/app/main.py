from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth
from app.core.database import engine, Base

# Create all database tables
# This reads all your Model classes and creates the actual tables in PostgreSQL
Base.metadata.create_all(bind=engine)

# Create the FastAPI app
app = FastAPI(
    title="OmniML API",
    description="AutoML Platform API",
    version="1.0.0"
)

# CORS — allows your React frontend to call this API
# Without this, browser blocks requests from different ports (security policy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React runs on port 3000
    allow_credentials=True,
    allow_methods=["*"],    # allow all HTTP methods
    allow_headers=["*"],    # allow all headers
)

# Register the auth router
app.include_router(auth.router)

@app.get("/")
def health_check():
    """Simple check that the server is running."""
    return {"status": "OmniML API is running 🚀"}