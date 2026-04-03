"""
Patient request/response models
"""
from pydantic import BaseModel
from typing import Optional, List


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = []
    conditions: Optional[List[str]] = []
    medical_history: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    medical_history: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    age: int
    gender: str
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: List[str] = []
    conditions: List[str] = []
    medical_history: Optional[str] = None
    created_by: str
    created_at: str
