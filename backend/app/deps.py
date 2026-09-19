import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")

    db.execute(text("SET LOCAL app.current_company_id = :cid"), {"cid": str(user.company_id)})
    return user
