"""
Patient CRUD routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from database import patients_collection, ObjectId
from patients.models import PatientCreate, PatientUpdate, PatientResponse
from auth.utils import get_current_user

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def _next_patient_id() -> str:
    last = patients_collection.find_one(sort=[("patient_id", -1)])
    if last and "patient_id" in last:
        num = int(last["patient_id"].split("-")[1]) + 1
    else:
        num = 1001
    return f"P-{num}"


def _doc_to_response(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "patient_id": doc["patient_id"],
        "name": doc["name"],
        "age": doc["age"],
        "gender": doc["gender"],
        "date_of_birth": doc.get("date_of_birth"),
        "phone": doc.get("phone"),
        "email": doc.get("email"),
        "address": doc.get("address"),
        "blood_type": doc.get("blood_type"),
        "allergies": doc.get("allergies", []),
        "conditions": doc.get("conditions", []),
        "medical_history": doc.get("medical_history"),
        "created_by": doc.get("created_by", ""),
        "created_at": doc.get("created_at", ""),
    }


@router.get("")
async def list_patients(current_user=Depends(get_current_user)):
    patients = patients_collection.find({"created_by": current_user["id"]})
    return {
        "success": True,
        "patients": [_doc_to_response(p) for p in patients],
    }


@router.post("")
async def create_patient(req: PatientCreate, current_user=Depends(get_current_user)):
    doc = {
        **req.model_dump(),
        "patient_id": _next_patient_id(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = patients_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"success": True, "patient": _doc_to_response(doc)}


@router.get("/{patient_id}")
async def get_patient(patient_id: str, current_user=Depends(get_current_user)):
    doc = patients_collection.find_one({
        "patient_id": patient_id,
        "created_by": current_user["id"],
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True, "patient": _doc_to_response(doc)}


@router.put("/{patient_id}")
async def update_patient(patient_id: str, req: PatientUpdate, current_user=Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = patients_collection.update_one(
        {"patient_id": patient_id, "created_by": current_user["id"]},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    doc = patients_collection.find_one({"patient_id": patient_id})
    return {"success": True, "patient": _doc_to_response(doc)}


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, current_user=Depends(get_current_user)):
    result = patients_collection.delete_one({
        "patient_id": patient_id,
        "created_by": current_user["id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True, "message": "Patient deleted"}
