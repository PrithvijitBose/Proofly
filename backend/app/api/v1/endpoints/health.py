from fastapi import APIRouter
from app.config import settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Get backend service health status")
def get_health() -> HealthResponse:
    """
    Check the health status of the backend API service.
    """
    return HealthResponse(
        status="ok",
        project_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        backend_url=settings.BACKEND_URL,
        frontend_url=settings.FRONTEND_URL,
    )
