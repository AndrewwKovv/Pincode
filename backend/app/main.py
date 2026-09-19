from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, projects, pins, photos, sync, import_export

app = FastAPI(title="Pincode API")

cors_origins = ["*"] if settings.cors_origins == "*" else settings.cors_origins.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(pins.router)
app.include_router(photos.router)
app.include_router(sync.router)
app.include_router(import_export.router)


@app.get("/health")
def health():
    return {"status": "ok"}
