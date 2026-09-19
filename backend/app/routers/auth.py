from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, User
from app.schemas import RegisterCompanyRequest, TokenResponse, UserOut
from app.security import hash_password, verify_password, create_access_token
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register_company(payload: RegisterCompanyRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.admin_email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email уже зарегистрирован")

    company = Company(name=payload.company_name)
    db.add(company)
    db.flush()

    admin = User(
        company_id=company.id,
        email=payload.admin_email,
        hashed_password=hash_password(payload.admin_password),
        full_name=payload.admin_full_name,
        role="admin",
    )
    db.add(admin)
    db.flush()

    token = create_access_token(admin.id, company.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный email или пароль")

    token = create_access_token(user.id, user.company_id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
