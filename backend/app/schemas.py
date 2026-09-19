import uuid
import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict

from app.models import UserRole


class RegisterCompanyRequest(BaseModel):
    company_name: str
    admin_email: EmailStr
    admin_password: str
    admin_full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    company_id: uuid.UUID


class ProjectCreate(BaseModel):
    id: uuid.UUID
    name: str


class ProjectUpdate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    pdf_object_key: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    version: int
    deleted: bool = False


class PinCreate(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    page_number: int
    x: float
    y: float
    description: str
    client_id: Optional[str] = None


class PinUpdate(BaseModel):
    description: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class PinOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    page_number: int
    x: float
    y: float
    description: str
    author_name: str
    is_conflict: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    version: int
    deleted: bool = False


class PhotoCreate(BaseModel):
    id: uuid.UUID
    pin_id: uuid.UUID
    object_key: Optional[str] = None


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pin_id: uuid.UUID
    object_key: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    version: int
    deleted: bool = False


class SyncResponse(BaseModel):
    server_time: datetime.datetime
    projects: List[ProjectOut]
    pins: List[PinOut]
    photos: List[PhotoOut]
