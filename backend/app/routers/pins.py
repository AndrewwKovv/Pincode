import datetime
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Photo, Pin, Project, User
from app.schemas import PhotoOut, PinCreate, PinOut, PinUpdate
from app.deps import get_current_user
from app.storage import photo_file_path

router = APIRouter(prefix="/pins", tags=["pins"])


@router.get("", response_model=List[PinOut])
def list_pins(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Pin)
        .filter(
            Pin.project_id == project_id,
            Pin.company_id == current_user.company_id,
            Pin.deleted_at.is_(None),
        )
        .order_by(Pin.created_at.asc())
        .all()
    )


@router.post("", response_model=PinOut, status_code=status.HTTP_201_CREATED)
def create_pin(
    payload: PinCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.get(Pin, payload.id)
    if existing is not None:
        if existing.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пин принадлежит другой компании")
        return existing

    project = db.query(Project).filter(
        Project.id == payload.project_id,
        Project.company_id == current_user.company_id,
        Project.deleted_at.is_(None),
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")

    pin = Pin(
        id=payload.id,
        project_id=payload.project_id,
        company_id=current_user.company_id,
        page_number=payload.page_number,
        x=payload.x,
        y=payload.y,
        description=payload.description,
        created_by=current_user.id,
        author_name=current_user.full_name,
        client_id=payload.client_id,
    )
    db.add(pin)
    db.flush()
    return pin


@router.patch("/{pin_id}", response_model=PinOut)
def update_pin(
    pin_id: str,
    payload: PinUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pin = db.query(Pin).filter(
        Pin.id == pin_id, Pin.company_id == current_user.company_id, Pin.deleted_at.is_(None)
    ).first()
    if pin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пин не найден")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pin, field, value)
    pin.version += 1
    db.flush()
    return pin


@router.post("/{pin_id}/photos", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_pin_photo(
    pin_id: str,
    file: UploadFile = File(...),
    photo_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pin = db.query(Pin).filter(
        Pin.id == pin_id, Pin.company_id == current_user.company_id, Pin.deleted_at.is_(None)
    ).first()
    if pin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пин не найден")

    new_id = uuid.UUID(photo_id) if photo_id else uuid.uuid4()
    existing = db.get(Photo, new_id)
    if existing is not None:
        if existing.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Фото принадлежит другой компании")
        return existing

    photo = Photo(id=new_id, pin_id=pin.id, company_id=current_user.company_id)
    db.add(photo)
    db.flush()

    filename = file.filename or f"{photo.id}.jpg"
    path = photo_file_path(photo.id, filename)
    path.write_bytes(await file.read())
    photo.object_key = str(path.relative_to(path.parents[2]))

    db.flush()
    return photo


@router.delete("/{pin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pin(pin_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pin = db.query(Pin).filter(
        Pin.id == pin_id, Pin.company_id == current_user.company_id, Pin.deleted_at.is_(None)
    ).first()
    if pin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пин не найден")

    now = datetime.datetime.now(datetime.timezone.utc)
    pin.deleted_at = now
    pin.updated_at = now
    pin.version += 1

    photos = db.query(Photo).filter(Photo.pin_id == pin.id, Photo.deleted_at.is_(None)).all()
    for photo in photos:
        photo.deleted_at = now
        photo.updated_at = now
        photo.version += 1
