import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Photo, Pin, User
from app.schemas import PhotoCreate, PhotoOut
from app.deps import get_current_user
from app.storage import STORAGE_ROOT

router = APIRouter(prefix="/photos", tags=["photos"])


@router.get("", response_model=List[PhotoOut])
def list_photos(
    pin_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Photo)
        .filter(
            Photo.pin_id == pin_id,
            Photo.company_id == current_user.company_id,
            Photo.deleted_at.is_(None),
        )
        .order_by(Photo.created_at.asc())
        .all()
    )


@router.post("", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
def create_photo(
    payload: PhotoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.get(Photo, payload.id)
    if existing is not None:
        if existing.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Фото принадлежит другой компании")
        return existing

    pin = db.query(Pin).filter(
        Pin.id == payload.pin_id, Pin.company_id == current_user.company_id, Pin.deleted_at.is_(None)
    ).first()
    if pin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пин не найден")

    photo = Photo(
        id=payload.id,
        pin_id=payload.pin_id,
        company_id=current_user.company_id,
        object_key=payload.object_key,
    )
    db.add(photo)
    db.flush()
    return photo


@router.get("/{photo_id}/file")
def get_photo_file(photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(
        Photo.id == photo_id, Photo.company_id == current_user.company_id, Photo.deleted_at.is_(None)
    ).first()
    if photo is None or not photo.object_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено")

    path = STORAGE_ROOT / photo.object_key
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл отсутствует в хранилище")
    return FileResponse(path)


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(
        Photo.id == photo_id, Photo.company_id == current_user.company_id, Photo.deleted_at.is_(None)
    ).first()
    if photo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено")

    now = datetime.datetime.now(datetime.timezone.utc)
    photo.deleted_at = now
    photo.updated_at = now
    photo.version += 1
