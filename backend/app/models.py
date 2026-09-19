import uuid
import enum

from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    foreman = "foreman"
    viewer = "viewer"


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    users = relationship("User", back_populates="company")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.foreman)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship("Company", back_populates="users")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    pdf_object_key = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    pins = relationship("Pin", back_populates="project", cascade="all, delete-orphan")

    @property
    def deleted(self) -> bool:
        return self.deleted_at is not None


class Pin(Base):
    __tablename__ = "pins"

    id = Column(UUID(as_uuid=True), primary_key=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    page_number = Column(Integer, nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    description = Column(Text, nullable=False, default="")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    author_name = Column(String, nullable=False, default="")
    client_id = Column(String, nullable=True)
    is_conflict = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="pins")
    photos = relationship("Photo", back_populates="pin", cascade="all, delete-orphan")

    @property
    def deleted(self) -> bool:
        return self.deleted_at is not None


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True)
    pin_id = Column(UUID(as_uuid=True), ForeignKey("pins.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    object_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    pin = relationship("Pin", back_populates="photos")

    @property
    def deleted(self) -> bool:
        return self.deleted_at is not None
