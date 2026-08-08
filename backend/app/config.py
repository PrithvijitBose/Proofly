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
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        if self.FRONTEND_URL:
            # Support multiple comma-separated frontend URLs (e.g. local + production + preview domains)
            for url in self.FRONTEND_URL.split(","):
                cleaned_url = url.strip().rstrip("/")
                if cleaned_url and cleaned_url not in origins:
                    origins.append(cleaned_url)
        return origins

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
