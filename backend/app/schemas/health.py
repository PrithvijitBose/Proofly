from pydantic import BaseModel, Field
from datetime import datetime


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Status of the API service")
    project_name: str = Field(..., description="Project Name")
    version: str = Field(..., description="API Version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Current UTC timestamp")
    backend_url: str = Field(..., description="Configured Backend URL")
    frontend_url: str = Field(..., description="Configured Frontend URL")
