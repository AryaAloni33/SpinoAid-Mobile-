"""
Authentication routes: register, login, me
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from database import users_collection, ObjectId
from auth.models import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from auth.utils import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    # Check if email exists
    if users_collection.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": req.name,
        "email": req.email,
        "password": hash_password(req.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_token(user_id)

    return AuthResponse(
        success=True,
        message="Registration successful",
        token=token,
        user=UserResponse(id=user_id, name=req.name, email=req.email),
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = users_collection.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_token(user_id)

    return AuthResponse(
        success=True,
        message="Login successful",
        token=token,
        user=UserResponse(id=user_id, name=user["name"], email=user["email"]),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return UserResponse(**current_user)
