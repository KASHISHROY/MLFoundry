import uuid
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.job import Job
from app.schemas.dataset import DatasetResponse, JobResponse
from app.services.storage import save_file, delete_file

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.post("/upload", response_model=DatasetResponse, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a CSV dataset.
    - Validates file type and size
    - Saves to disk
    - Reads metadata (rows, columns)
    - Creates dataset record in DB
    - Queues training job
    """

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # Read file content to validate and get metadata
    content = await file.read()
    file_size = len(content)

    # Validate file size (max 50MB)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 50MB")

    # Reset file pointer after reading
    await file.seek(0)

    # Parse CSV to get metadata
    try:
        import io
        df = pd.read_csv(io.BytesIO(content))
        row_count    = len(df)
        column_count = len(df.columns)
        columns      = df.columns.tolist()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    # Validate target column exists
    if target_column not in columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{target_column}' not found in CSV"
        )

    # Generate unique filename to avoid conflicts
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = save_file(file, unique_filename)

    # Save dataset record to database
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

    # Create training job record
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

    # TODO Day 4: actually queue the job in Celery here

    return dataset


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
    """Delete a dataset."""
    dataset = db.query(Dataset)\
        .filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id)\
        .first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Delete file from disk
    delete_file(dataset.file_path)

    # Delete from database
    db.delete(dataset)
    db.commit()