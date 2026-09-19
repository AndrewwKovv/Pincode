import base64
from pathlib import Path

from app.config import settings

_configured_root = Path(settings.storage_root)
STORAGE_ROOT = (
    _configured_root if _configured_root.is_absolute() else Path(__file__).resolve().parent.parent / _configured_root
)


def project_pdf_path(project_id) -> Path:
    directory = STORAGE_ROOT / "projects" / str(project_id)
    directory.mkdir(parents=True, exist_ok=True)
    return directory / "plan.pdf"


def photo_file_path(photo_id, filename: str) -> Path:
    directory = STORAGE_ROOT / "photos" / str(photo_id)
    directory.mkdir(parents=True, exist_ok=True)
    return directory / filename


def write_base64(path: Path, data_base64: str) -> None:
    path.write_bytes(base64.b64decode(data_base64))
