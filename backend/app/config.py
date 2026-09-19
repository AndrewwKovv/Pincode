from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    storage_root: str = "storage"
    cors_origins: str = "*"

    class Config:
        env_file = ".env"


settings = Settings()
