import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project, Pin, Photo, User
from app.schemas import SyncResponse
from app.deps import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("", response_model=SyncResponse)
def sync(
    since: Optional[datetime.datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server_time = datetime.datetime.now(datetime.timezone.utc)

    projects_query = db.query(Project).filter(Project.company_id == current_user.company_id)
    pins_query = db.query(Pin).filter(Pin.company_id == current_user.company_id)
    photos_query = db.query(Photo).filter(Photo.company_id == current_user.company_id)

    if since is not None:
        projects_query = projects_query.filter(Project.updated_at > since)
        pins_query = pins_query.filter(Pin.updated_at > since)
        photos_query = photos_query.filter(Photo.updated_at > since)

    return SyncResponse(
        server_time=server_time,
        projects=projects_query.all(),
        pins=pins_query.all(),
        photos=photos_query.all(),
    )
