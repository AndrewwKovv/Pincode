import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Photo, Pin, Project, User
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate
from app.deps import get_current_user
from app.storage import STORAGE_ROOT, project_pdf_path

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Project)
        .filter(Project.company_id == current_user.company_id, Project.deleted_at.is_(None))
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.get(Project, payload.id)
    if existing is not None:
        if existing.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Проект принадлежит другой компании")
        return existing

    project = Project(
        id=payload.id,
        company_id=current_user.company_id,
        name=payload.name,
        created_by=current_user.id,
    )
    db.add(project)
    db.flush()
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(
        Project.id == project_id, Project.company_id == current_user.company_id, Project.deleted_at.is_(None)
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    return project


@router.get("/{project_id}/pdf")
def get_project_pdf(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(
        Project.id == project_id, Project.company_id == current_user.company_id, Project.deleted_at.is_(None)
    ).first()
    if project is None or not project.pdf_object_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF не найден")

    path = STORAGE_ROOT / project.pdf_object_key
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл отсутствует в хранилище")
    return FileResponse(path, media_type="application/pdf")


@router.post("/{project_id}/pdf", response_model=ProjectOut)
async def upload_project_pdf(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.company_id == current_user.company_id, Project.deleted_at.is_(None)
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")

    path = project_pdf_path(project.id)
    path.write_bytes(await file.read())
    project.pdf_object_key = str(path.relative_to(STORAGE_ROOT))
    db.flush()
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.company_id == current_user.company_id, Project.deleted_at.is_(None)
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")

    project.name = payload.name
    project.version += 1
    db.flush()
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(
        Project.id == project_id, Project.company_id == current_user.company_id, Project.deleted_at.is_(None)
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")

    now = datetime.datetime.now(datetime.timezone.utc)
    project.deleted_at = now
    project.updated_at = now
    project.version += 1

    pins = db.query(Pin).filter(Pin.project_id == project.id, Pin.deleted_at.is_(None)).all()
    for pin in pins:
        pin.deleted_at = now
        pin.updated_at = now
        pin.version += 1
        photos = db.query(Photo).filter(Photo.pin_id == pin.id, Photo.deleted_at.is_(None)).all()
        for photo in photos:
            photo.deleted_at = now
            photo.updated_at = now
            photo.version += 1
