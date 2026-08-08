from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Proofly API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # URL configurations
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Allowed CORS Origins
    @property
    def cors_origins(self) -> List[str]:
        return [self.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
