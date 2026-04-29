from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.job import Job
from app.models.dataset import Dataset
from ml.graph import run_agentic_pipeline
from datetime import datetime


def update_job(db, job_id: int, **kwargs):
    db.query(Job).filter(Job.id == job_id).update(kwargs)
    db.commit()


@celery_app.task(bind=True, name="train_model")
def train_model_task(self, job_id: int):
    db = SessionLocal()

    try:
        job     = db.query(Job).filter(Job.id == job_id).first()
        dataset = db.query(Dataset).filter(
            Dataset.id == job.dataset_id
        ).first()

        if not job or not dataset:
            return {"error": "Job or dataset not found"}

        logs = ["🚀 Training job started..."]

        def log_and_save(message: str):
            logs.append(message)
            db.query(Job).filter(Job.id == job_id).update({
                "logs": list(logs)
            })
            db.commit()

        # Map agent names to stage + progress
        stage_map = {
            "DataCleanerAgent":     ("cleaning",     15),
            "FeatureEngineerAgent": ("engineering",  35),
            "ModelSelectorAgent":   ("training",     55),
            "TunerAgent":           ("tuning",       80),
            "ExplainerAgent":       ("importance",   90),
        }

        def smart_log(message: str):
            for agent_name, (stage, progress) in stage_map.items():
                if agent_name in message:
                    db.query(Job).filter(Job.id == job_id).update({
                        "stage":    stage,
                        "progress": progress,
                    })
                    db.commit()
                    break
            log_and_save(message)

        # Mark as running
        update_job(db, job_id,
            status="running",
            stage="loading",
            progress=5,
            logs=logs,
            started_at=datetime.utcnow()
        )

        # Run LangGraph agentic pipeline
        results = run_agentic_pipeline(
            file_path=dataset.file_path,
            target_column=dataset.target_column,
            log_callback=smart_log
        )

        # Mark as complete
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