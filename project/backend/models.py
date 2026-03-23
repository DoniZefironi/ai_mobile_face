from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import json

class Celebrity(Base):
    __tablename__ = "celebrity_faces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    photo_path = Column(String)
    embedding = Column(String)  
    style_description = Column(String)
    shops_links = Column(String)  

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False) 
    email = Column(String, unique=True, index=True, nullable=False)

    saved_styles = relationship("SavedStyle", back_populates="user")

class SavedStyle(Base):
    __tablename__ = "saved_styles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    celebrity_id = Column(Integer, ForeignKey("celebrity_faces.id"), nullable=False)

    user = relationship("User", back_populates="saved_styles")
    celebrity = relationship("Celebrity")