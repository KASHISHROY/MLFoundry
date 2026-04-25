from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
# prefix="/auth" means all routes here start with /auth
# So register becomes POST /auth/register

@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    - Checks email not already taken
    - Hashes password
    - Saves to database
    - Returns user info (no password)
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user object
    new_user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password)  # NEVER store plain password
    )
    
    # Save to database
    db.add(new_user)
    db.commit()           # actually writes to DB
    db.refresh(new_user)  # reload from DB (gets the auto-generated id, created_at etc.)
    
    return new_user


@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email + password.
    - Finds user by email
    - Verifies password
    - Returns JWT access token + refresh token
    """
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    
    # User not found OR password wrong — same error message (security: don't reveal which)
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db)):
    """Placeholder — Day 2 we'll add proper auth middleware here."""
    pass

from app.core.security import decode_token

@router.post("/refresh")
def refresh_token(payload: dict, db: Session = Depends(get_db)):
    """Get a new access token using refresh token."""
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token required")

    data = decode_token(token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == int(data["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": new_token, "token_type": "bearer"}
