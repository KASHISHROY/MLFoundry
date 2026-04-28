from celery import Celery
from app.core.config import settings

# Create the Celery app
# broker = Redis (where jobs wait)
# backend = Redis (where results are stored)
celery_app = Celery(
    "omniml",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"]  # where our tasks live
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # retry failed tasks after 5 seconds, max 3 retries
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)