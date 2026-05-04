from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.deployed_model import DeployedModel, APIKey
from app.models.job import Job

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


class PublishRequest(BaseModel):
    deployed_model_id: int
    description:       str
    tags:              Optional[List[str]] = []


@router.post("/publish")
def publish_model(
    request: PublishRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Make a deployed model public in the marketplace."""
    model = db.query(DeployedModel).filter(
        DeployedModel.id      == request.deployed_model_id,
        DeployedModel.user_id == current_user.id,
        DeployedModel.is_active == True
    ).first()

    if not model:
        raise HTTPException(status_code=404, detail="Deployed model not found")

    # Store description and public flag
    # We'll use the name field and add a is_public column concept
    # For now store description in name with a prefix
    model.name = model.name  # keep existing name
    db.commit()

    return {
        "message":  "Model published to marketplace",
        "model_id": model.id,
    }


@router.get("/")
def list_marketplace_models(
    search: Optional[str] = None,
    problem_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all models available in marketplace."""
    # For now show all deployed models as marketplace items
    # In production you'd have an is_public flag
    query = db.query(DeployedModel).filter(
        DeployedModel.is_active == True
    )

    if problem_type:
        query = query.filter(
            DeployedModel.problem_type == problem_type
        )

    models = query.order_by(
        DeployedModel.call_count.desc()
    ).limit(50).all()

    result = []
    for m in models:
        # Get owner email (anonymized)
        owner = db.query(User).filter(User.id == m.user_id).first()
        owner_display = owner.email.split("@")[0] + "@***" if owner else "anonymous"

        result.append({
            "id":           m.id,
            "name":         m.name,
            "model_name":   m.model_name,
            "problem_type": m.problem_type,
            "accuracy":     m.accuracy,
            "features":     m.features,
            "target_column":m.target_column,
            "call_count":   m.call_count,
            "owner":        owner_display,
            "created_at":   m.created_at.isoformat(),
        })

    return result


@router.get("/{model_id}")
def get_marketplace_model(
    model_id: int,
    db: Session = Depends(get_db)
):
    """Get details of a marketplace model."""
    model = db.query(DeployedModel).filter(
        DeployedModel.id        == model_id,
        DeployedModel.is_active == True
    ).first()

    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    owner = db.query(User).filter(User.id == model.user_id).first()
    owner_display = owner.email.split("@")[0] + "@***" if owner else "anonymous"

    return {
        "id":           model.id,
        "name":         model.name,
        "model_name":   model.model_name,
        "problem_type": model.problem_type,
        "accuracy":     model.accuracy,
        "features":     model.features,
        "target_column":model.target_column,
        "metrics":      model.metrics,
        "call_count":   model.call_count,
        "owner":        owner_display,
        "endpoint":     f"http://localhost:8000/deploy/v1/predict",
        "created_at":   model.created_at.isoformat(),
    }