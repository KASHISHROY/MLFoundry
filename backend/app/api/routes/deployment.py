import os
import uuid
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.deployed_model import DeployedModel, APIKey
from app.schemas.deployment import (
    DeployRequest, DeployedModelResponse,
    APIKeyResponse, PredictRequest, PredictionResult
)

router = APIRouter(prefix="/deploy", tags=["Deployment"])


# ─────────────────────────────────────────────────────────
# DEPLOY A TRAINED MODEL
# ─────────────────────────────────────────────────────────

@router.post("/", response_model=dict, status_code=201)
def deploy_model(
    request: DeployRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(
        Job.id      == request.job_id,
        Job.user_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed. Status: {job.status}")

    result = job.result
    if not result:
        raise HTTPException(status_code=400, detail="No results found for this job")

    model_path = result.get("model_path")
    if not model_path or not os.path.exists(model_path):
        raise HTTPException(
            status_code=400,
            detail="Trained model file not found on disk. Please retrain the model."
        )

    # Check if already deployed
    existing = db.query(DeployedModel).filter(
        DeployedModel.job_id   == request.job_id,
        DeployedModel.user_id  == current_user.id,
        DeployedModel.is_active == True
    ).first()

    if existing:
        api_key = db.query(APIKey).filter(
            APIKey.deployed_model_id == existing.id,
            APIKey.is_active         == True
        ).first()
        return {
            "deployed_model_id": existing.id,
            "api_key":           api_key.key if api_key else None,
            "message":           "Model already deployed",
            "already_existed":   True,
        }

    # Get target column from dataset
    target_column = ""
    if job.dataset:
        target_column = job.dataset.target_column or ""

    deployed = DeployedModel(
        user_id       = current_user.id,
        job_id        = request.job_id,
        dataset_id    = job.dataset_id,
        name          = request.name,
        model_name    = result.get("best_model", "Unknown"),
        problem_type  = result.get("problem_type", "classification"),
        accuracy      = (result.get("best_metrics") or {}).get("accuracy") or
                        (result.get("best_metrics") or {}).get("r2_score"),
        features      = result.get("features", []),
        target_column = target_column,
        model_path    = model_path,
        metrics       = result.get("best_metrics", {}),
        is_active     = True,
    )
    db.add(deployed)
    db.commit()
    db.refresh(deployed)

    raw_key = f"mf_live_{uuid.uuid4().hex}"
    api_key = APIKey(
        user_id           = current_user.id,
        deployed_model_id = deployed.id,
        key               = raw_key,
        name              = f"Key for {request.name}",
        is_active         = True,
    )
    db.add(api_key)
    db.commit()

    return {
        "deployed_model_id": deployed.id,
        "api_key":           raw_key,
        "message":           "Model deployed successfully",
        "already_existed":   False,
    }


# ─────────────────────────────────────────────────────────
# LIST DEPLOYED MODELS
# ─────────────────────────────────────────────────────────

@router.get("/models", response_model=List[DeployedModelResponse])
def list_deployed_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(DeployedModel).filter(
        DeployedModel.user_id  == current_user.id,
        DeployedModel.is_active == True
    ).order_by(DeployedModel.created_at.desc()).all()


# ─────────────────────────────────────────────────────────
# GET ONE DEPLOYED MODEL WITH API KEY
# ─────────────────────────────────────────────────────────

@router.get("/models/{model_id}")
def get_deployed_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model = db.query(DeployedModel).filter(
        DeployedModel.id      == model_id,
        DeployedModel.user_id == current_user.id
    ).first()

    if not model:
        raise HTTPException(status_code=404, detail="Deployed model not found")

    api_key = db.query(APIKey).filter(
        APIKey.deployed_model_id == model_id,
        APIKey.is_active         == True
    ).first()

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
        "created_at":   model.created_at,
        "api_key":      api_key.key if api_key else None,
    }


# ─────────────────────────────────────────────────────────
# PREDICT — AUTHENTICATED (via JWT, for the tester UI)
# ─────────────────────────────────────────────────────────

@router.post("/predict/{model_id}", response_model=PredictionResult)
def predict(
    model_id: int,
    request: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model_record = db.query(DeployedModel).filter(
        DeployedModel.id      == model_id,
        DeployedModel.user_id == current_user.id,
        DeployedModel.is_active == True
    ).first()

    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(model_record.model_path):
        raise HTTPException(
            status_code=500,
            detail="Model file not found on disk. Please redeploy."
        )

    with open(model_record.model_path, "rb") as f:
        package = pickle.load(f)

    model        = package["model"]
    scaler       = package["scaler"]
    features     = package["features"]
    problem_type = package["problem_type"]
    model_name   = package["model_name"]

    # Validate all required features present
    missing = [f for f in features if f not in request.data]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing features: {missing}. Required: {features}"
        )

    # Convert all values to float — reject strings with clear message
    converted_data = {}
    for f in features:
        val = request.data.get(f)
        try:
            converted_data[f] = float(val)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Feature '{f}' must be a number. Got: '{val}'. "
                       f"Note: text columns like Surname are label-encoded — enter a number instead."
            )

    input_df  = pd.DataFrame([converted_data])[features]
    input_arr = scaler.transform(input_df)

    prediction = model.predict(input_arr)[0]

    probability      = None
    prediction_label = None

    if problem_type == "classification":
        if hasattr(model, "predict_proba"):
            proba       = model.predict_proba(input_arr)[0]
            probability = float(max(proba))
        prediction_label = str(int(prediction))
        prediction_val   = int(prediction)
    else:
        prediction_val = float(round(float(prediction), 4))

    # SHAP for this prediction
    shap_explanation = []
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(input_arr)

        if problem_type == "classification" and isinstance(shap_vals, list):
            sv = shap_vals[1][0]
        else:
            sv = shap_vals[0]

        shap_explanation = sorted([
            {
                "feature":    features[i],
                "value":      converted_data.get(features[i]),
                "shap_value": round(float(sv[i]), 4),
                "direction":  "increases" if sv[i] > 0 else "decreases",
                "magnitude":  round(abs(float(sv[i])), 4),
            }
            for i in range(len(features))
        ], key=lambda x: x["magnitude"], reverse=True)

    except Exception:
        shap_explanation = []

    plain_english = _generate_plain_english(
        prediction_val, shap_explanation,
        problem_type, package["target"], probability
    )

    model_record.call_count += 1
    db.commit()

    return PredictionResult(
        prediction        = prediction_val,
        prediction_label  = prediction_label,
        probability       = probability,
        shap_explanation  = shap_explanation,
        plain_english     = plain_english,
        model_name        = model_name,
        problem_type      = problem_type,
    )


# ─────────────────────────────────────────────────────────
# PUBLIC PREDICT — via API key (for external apps)
# ─────────────────────────────────────────────────────────

@router.post("/v1/predict")
def public_predict(
    request: PredictRequest,
    api_key: str,
    db: Session = Depends(get_db)
):
    key_record = db.query(APIKey).filter(
        APIKey.key       == api_key,
        APIKey.is_active == True
    ).first()

    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid API key")

    model_record = db.query(DeployedModel).filter(
        DeployedModel.id        == key_record.deployed_model_id,
        DeployedModel.is_active == True
    ).first()

    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(model_record.model_path):
        raise HTTPException(status_code=500, detail="Model file not found")

    with open(model_record.model_path, "rb") as f:
        package = pickle.load(f)

    model        = package["model"]
    scaler       = package["scaler"]
    features     = package["features"]
    problem_type = package["problem_type"]

    missing = [f for f in features if f not in request.data]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing features: {missing}")

    # Convert to float
    converted_data = {}
    for f in features:
        val = request.data.get(f)
        try:
            converted_data[f] = float(val)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Feature '{f}' must be a number. Got: '{val}'"
            )

    input_df  = pd.DataFrame([converted_data])[features]
    input_arr = scaler.transform(input_df)
    prediction = model.predict(input_arr)[0]

    probability = None
    if problem_type == "classification" and hasattr(model, "predict_proba"):
        proba       = model.predict_proba(input_arr)[0]
        probability = float(max(proba))

    shap_explanation = []
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(input_arr)
        if problem_type == "classification" and isinstance(shap_vals, list):
            sv = shap_vals[1][0]
        else:
            sv = shap_vals[0]

        shap_explanation = sorted([
            {
                "feature":    features[i],
                "value":      converted_data.get(features[i]),
                "shap_value": round(float(sv[i]), 4),
                "direction":  "increases" if sv[i] > 0 else "decreases",
                "magnitude":  round(abs(float(sv[i])), 4),
            }
            for i in range(len(features))
        ], key=lambda x: x["magnitude"], reverse=True)
    except Exception:
        pass

    plain_english = _generate_plain_english(
        float(prediction), shap_explanation,
        problem_type, package["target"], probability
    )

    key_record.call_count   += 1
    key_record.last_used_at  = datetime.utcnow()
    model_record.call_count += 1
    db.commit()

    return {
        "prediction":       float(prediction),
        "probability":      probability,
        "shap_explanation": shap_explanation,
        "plain_english":    plain_english,
        "model":            package["model_name"],
    }


# ─────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────

def _generate_plain_english(
    prediction, shap_explanation: list,
    problem_type: str, target: str,
    probability: float = None
) -> str:
    if not shap_explanation:
        return f"The model predicted {prediction} for {target}."

    top_factors = shap_explanation[:3]

    if problem_type == "classification":
        prob_str = f" (confidence: {probability * 100:.1f}%)" if probability else ""
        explanation = f"The model predicted class {prediction}{prob_str}. "
        explanation += "The main reasons are: "
        reasons = []
        for f in top_factors:
            direction = "increases" if f["direction"] == "increases" else "decreases"
            reasons.append(
                f"{f['feature']} = {f['value']} "
                f"({direction} the prediction by {f['magnitude']:.4f})"
            )
        explanation += ", ".join(reasons) + "."
    else:
        explanation = f"The model predicted {target} = {prediction:.2f}. "
        explanation += "Top factors: "
        reasons = []
        for f in top_factors:
            direction = "pushed it higher" if f["direction"] == "increases" else "pushed it lower"
            reasons.append(
                f"{f['feature']} = {f['value']} ({direction} by {f['magnitude']:.4f})"
            )
        explanation += ", ".join(reasons) + "."

    return explanation