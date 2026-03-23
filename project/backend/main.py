import logging
import numpy as np
import json
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models import User, SavedStyle, Celebrity
from database import get_db
import face_utils
import os
import uuid
from auth import get_current_user, create_access_token, get_password_hash, authenticate_user
from typing import Optional
from fastapi import Form
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO)

base_url = "http://10.103.25.248:8000"

app = FastAPI()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..", "static")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    

def normalize_photo(path: str) -> str:
    if not path:
        return None

    if path.startswith("http://") or path.startswith("https://"):
        return path

    if not path.startswith("/"):
        path = "/" + path

    return base_url + path


class RegisterUser(BaseModel):
    username: str
    email: str
    password: str


class LoginUser(BaseModel):
    username: str
    password: str


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/register")
def register_user(user_data: RegisterUser, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    password = user_data.password[:72]
    hashed_password = get_password_hash(password)

    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"msg": "User created successfully"}


@app.post("/token")
def login_user(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/analyze")
async def analyze_style(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    UPLOAD_DIR = "uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.jpg")

    with open(file_path, "wb") as f:
        f.write(await file.read())

    input_emb = face_utils.get_face_embedding(file_path)
    if input_emb is None:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Лицо не обнаружено")

    celebrities = db.query(Celebrity).all()
    match, similarity = face_utils.find_closest_celebrity(input_emb, celebrities)

    os.remove(file_path)

    if match is None:
        raise HTTPException(status_code=404, detail="Совпадений не найдено")

    return {
        "id": match.id,
        "name": match.name,
        "celebrity_photo": normalize_photo(match.photo_path),
        "style_description": match.style_description,
        "similarity": float(similarity),
        "shops_links": match.shops_links
    }


@app.post("/save_style/{celebrity_id}")
def save_celebrity_style(
    celebrity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    celebrity = db.query(Celebrity).filter(Celebrity.id == celebrity_id).first()

    if not celebrity:
        raise HTTPException(status_code=404, detail="Celebrity not found")

    already = db.query(SavedStyle).filter(
        SavedStyle.user_id == current_user.id,
        SavedStyle.celebrity_id == celebrity_id
    ).first()

    if already:
        raise HTTPException(status_code=400, detail="Style already saved")

    saved_style = SavedStyle(user_id=current_user.id, celebrity_id=celebrity_id)
    db.add(saved_style)
    db.commit()

    return {"msg": "Style saved successfully"}


@app.get("/saved_styles")
def get_saved_styles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = db.query(SavedStyle).filter(SavedStyle.user_id == current_user.id).all()

    result = []
    for s in saved:
        result.append({
            "id": s.celebrity.id,
            "name": s.celebrity.name,
            "photo_path": normalize_photo(s.celebrity.photo_path),
            "style_description": s.celebrity.style_description,
            "shops_links": s.celebrity.shops_links
        })

    return result

@app.delete("/saved_styles/{celebrity_id}")
def delete_saved_style(
    celebrity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    saved = db.query(SavedStyle).filter(
        SavedStyle.user_id == current_user.id,
        SavedStyle.celebrity_id == celebrity_id
    ).first()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved style not found")

    db.delete(saved)
    db.commit()

    return {"msg": "Style removed successfully"}

@app.get("/celebrities")
def get_all_celebrities(db: Session = Depends(get_db)):
    celebrities = db.query(Celebrity).all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "photo_path": normalize_photo(c.photo_path),
            "style_description": c.style_description,
            "shops_links": c.shops_links
        }
        for c in celebrities
    ]
