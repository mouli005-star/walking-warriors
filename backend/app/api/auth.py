from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import NGOAdmin, EventLog
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import json

router  = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

# ── CONFIG ───────────────────────────────────────────────────────────────
SECRET_KEY = "bloodbridge-secret-2025-hackathon"
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 12

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── SCHEMAS ──────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email:    str
    password: str

# ── HELPERS ─────────────────────────────────────────────────────────────
def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def hash_password(password):
    return pwd_context.hash(password)

def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email   = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    admin = db.query(NGOAdmin).filter(NGOAdmin.email == email).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

# ── LOGIN ─────────────────────────────────────────────────────────────────
@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(NGOAdmin).filter(NGOAdmin.email == request.email).first()

    if not admin or not verify_password(request.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_token({"sub": admin.email, "role": admin.role, "name": admin.name})

    db.add(EventLog(
        event_type='ADMIN_LOGIN',
        entity_type='admin',
        entity_id=str(admin.id),
        payload=json.dumps({'email': admin.email, 'login_at': datetime.now().isoformat()})
    ))
    db.commit()

    return {
        "access_token": token,
        "token_type":   "bearer",
        "admin_name":   admin.name,
        "role":         admin.role,
        "expires_in":   f"{TOKEN_EXPIRE_HOURS} hours"
    }

# ── GET CURRENT ADMIN PROFILE ─────────────────────────────────────────────
@router.get("/me")
def get_me(current_admin: NGOAdmin = Depends(get_current_admin)):
    return {
        "id":    current_admin.id,
        "name":  current_admin.name,
        "email": current_admin.email,
        "role":  current_admin.role
    }

# ── SEED ADMIN HELPER (call once) ─────────────────────────────────────────
@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    existing = db.query(NGOAdmin).filter(
        NGOAdmin.email == "admin@bloodwarriors.in"
    ).first()
    if existing:
        return {"message": "Admin already exists"}

    admin = NGOAdmin(
        name          = "Blood Warriors Admin",
        email         = "admin@bloodwarriors.in",
        password_hash = hash_password("BloodWarriors@2025"),
        role          = "admin"
    )
    db.add(admin)
    db.commit()
    return {
        "message":  "Admin seeded",
        "email":    "admin@bloodwarriors.in",
        "password": "BloodWarriors@2025"
    }
