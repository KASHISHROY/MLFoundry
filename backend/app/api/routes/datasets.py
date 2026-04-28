import uuid
import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.job import Job
from app.schemas.dataset import DatasetResponse, JobResponse, UploadResponse
from app.services.storage import save_file, delete_file

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a CSV dataset.
    - Validates file type and size
    - Reads metadata (rows, columns)
    - Saves to disk
    - Creates dataset + job records
    - Queues training job in Celery
    """

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # Read content
    content = await file.read()
    file_size = len(content)

    # Validate size (max 50MB)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 50MB")

    # Parse CSV to get metadata
    try:
        df = pd.read_csv(io.BytesIO(content))
        row_count    = len(df)
        column_count = len(df.columns)
        columns      = df.columns.tolist()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    # Validate target column
    if target_column not in columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{target_column}' not found in CSV"
        )

    # Save file to disk with unique name
    await file.seek(0)
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = save_file(file, unique_filename)

    # Create dataset record
    dataset = Dataset(
        user_id       = current_user.id,
        name          = file.filename,
        file_path     = file_path,
        file_size     = file_size,
        row_count     = row_count,
        column_count  = column_count,
        columns       = columns,
        target_column = target_column,
        status        = "uploaded"
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Create job record
    job = Job(
        user_id    = current_user.id,
        dataset_id = dataset.id,
        status     = "queued",
        progress   = 0,
        stage      = "queued",
        logs       = ["Job created, waiting to start..."]
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Queue training job in Celery
    from app.workers.tasks import train_model_task
    train_model_task.delay(job.id)

    return UploadResponse(dataset=dataset, job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get training job status, progress and logs."""
    job = db.query(Job)\
        .filter(Job.id == job_id, Job.user_id == current_user.id)\
        .first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@router.get("/", response_model=List[DatasetResponse])
def get_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all datasets for the current user."""
    datasets = db.query(Dataset)\
        .filter(Dataset.user_id == current_user.id)\
        .order_by(Dataset.created_at.desc())\
        .all()
    return datasets


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific dataset."""
    dataset = db.query(Dataset)\
        .filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id)\
        .first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a dataset and its file from disk."""
    dataset = db.query(Dataset)\
        .filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id)\
        .first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    delete_file(dataset.file_path)
    db.delete(dataset)
    db.commit()