import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project, Pin, Photo, User
from app.schemas import ProjectOut
from app.deps import get_current_user
from app.storage import project_pdf_path, photo_file_path, write_base64

router = APIRouter(prefix="/projects", tags=["import"])


class ImportedPhoto(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    filename: str
    base64: str


class ImportedPin(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    page_number: int = Field(alias="pageNumber")
    x: float
    y: float
    description: str
    author: str
    photos: List[ImportedPhoto] = []


class ImportedProjectFile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    format_version: int = Field(alias="formatVersion")
    project: dict
    pdf_base64: str = Field(alias="pdfBase64")
    pins: List[ImportedPin]


@router.post("/import", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def import_project(
    payload: ImportedProjectFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.format_version != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неподдерживаемая версия файла")

    name: Optional[str] = payload.project.get("name")
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="В файле нет названия проекта")

    project = Project(
        id=uuid.uuid4(),
        company_id=current_user.company_id,
        name=name,
        created_by=current_user.id,
    )
    db.add(project)
    db.flush()

    pdf_path = project_pdf_path(project.id)
    write_base64(pdf_path, payload.pdf_base64)
    project.pdf_object_key = str(pdf_path.relative_to(pdf_path.parents[2]))

    for pin_data in payload.pins:
        pin = Pin(
            id=uuid.uuid4(),
            project_id=project.id,
            company_id=current_user.company_id,
            page_number=pin_data.page_number,
            x=pin_data.x,
            y=pin_data.y,
            description=pin_data.description,
            author_name=pin_data.author or current_user.full_name,
            created_by=current_user.id,
        )
        db.add(pin)
        db.flush()

        for photo_data in pin_data.photos:
            photo = Photo(id=uuid.uuid4(), pin_id=pin.id, company_id=current_user.company_id)
            db.add(photo)
            db.flush()
            photo_path = photo_file_path(photo.id, photo_data.filename)
            write_base64(photo_path, photo_data.base64)
            photo.object_key = str(photo_path.relative_to(photo_path.parents[2]))

    db.flush()
    return project
