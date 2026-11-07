from fastapi import APIRouter

from .. import schemas
from ..services import repository

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary() -> dict:
    return repository.dashboard_summary()
