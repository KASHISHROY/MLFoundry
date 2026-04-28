from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.job import Job
from app.models.dataset import Dataset
from ml.pipeline import run_full_pipeline
from datetime import datetime

def update_job(db, job_id: int, **kwargs):
    db.query(Job).filter(Job.id == job_id).update(kwargs)
    db.commit()

@celery_app.task(bind=True, name="train_model")
def train_model_task(self, job_id: int):
    db = SessionLocal()

    try:
        job     = db.query(Job).filter(Job.id == job_id).first()
        dataset = db.query(Dataset).filter(Dataset.id == job.dataset_id).first()

        if not job or not dataset:
            return {"error": "Job or dataset not found"}

        logs = ["🚀 Training job started..."]

        def log_and_save(message: str):
            logs.append(message)
            db.query(Job).filter(Job.id == job_id).update({"logs": list(logs)})
            db.commit()

        # Start
        update_job(db, job_id,
            status="running",
            stage="loading",
            progress=5,
            logs=logs,
            started_at=datetime.utcnow()
        )

        # Stage progress updates happen inside run_full_pipeline
        # via log_and_save callback

        # Track stage by log messages
        stage_map = {
            "Stage 1": ("cleaning",  15),
            "Stage 2": ("engineering", 35),
            "Stage 3": ("training",  55),
            "Stage 4": ("tuning",    80),
            "Stage 5": ("importance", 90),
        }

        def smart_log(message: str):
            # Update stage and progress based on message content
            for key, (stage, progress) in stage_map.items():
                if key in message:
                    db.query(Job).filter(Job.id == job_id).update({
                        "stage":    stage,
                        "progress": progress,
                    })
                    db.commit()
                    break
            log_and_save(message)

        results = run_full_pipeline(
            file_path=dataset.file_path,
            target_column=dataset.target_column,
            log_callback=smart_log
        )

        # Complete
        update_job(db, job_id,
            status="completed",
            stage="completed",
            progress=100,
            result=results,
            completed_at=datetime.utcnow()
        )

        dataset.status = "ready"
        db.commit()

        log_and_save("🎉 Training complete!")
        return results

    except Exception as e:
        db.query(Job).filter(Job.id == job_id).update({
            "status": "failed",
            "stage":  "failed",
            "error":  str(e),
        })
        db.commit()
        raise e

    finally:
        db.close()