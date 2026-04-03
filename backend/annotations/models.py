"""
Annotation request/response models
"""
from pydantic import BaseModel
from typing import Optional, List


class AnnotationPoint(BaseModel):
    x: float
    y: float


class AnnotationData(BaseModel):
    id: str
    type: str
    points: List[AnnotationPoint]
    color: str
    strokeWidth: Optional[float] = 2
    text: Optional[str] = None


class SaveAnnotationsRequest(BaseModel):
    patient_id: str
    image_name: str
    annotations: List[AnnotationData]


class AnnotationRecord(BaseModel):
    id: str
    patient_id: str
    image_name: str
    annotations: List[dict]
    created_by: str
    created_at: str
