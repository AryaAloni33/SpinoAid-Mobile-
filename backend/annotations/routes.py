"""
Annotation save/fetch routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from database import annotations_collection, ObjectId
from annotations.models import SaveAnnotationsRequest
from auth.utils import get_current_user

router = APIRouter(prefix="/api/annotations", tags=["Annotations"])


@router.post("")
async def save_annotations(req: SaveAnnotationsRequest, current_user=Depends(get_current_user)):
    doc = {
        "patient_id": req.patient_id,
        "image_name": req.image_name,
        "annotations": [a.model_dump() for a in req.annotations],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = annotations_collection.insert_one(doc)
    return {
        "success": True,
        "message": f"Saved {len(req.annotations)} annotations",
        "id": str(result.inserted_id),
    }


@router.get("/{patient_id}")
async def get_annotations(patient_id: str, current_user=Depends(get_current_user)):
    records = annotations_collection.find({
        "patient_id": patient_id,
        "created_by": current_user["id"],
    }).sort("created_at", -1)

    results = []
    for doc in records:
        results.append({
            "id": str(doc["_id"]),
            "patient_id": doc["patient_id"],
            "image_name": doc["image_name"],
            "annotations": doc["annotations"],
            "created_by": doc["created_by"],
            "created_at": doc["created_at"],
        })

    return {"success": True, "records": results}


@router.delete("/{annotation_id}")
async def delete_annotation(annotation_id: str, current_user=Depends(get_current_user)):
    result = annotations_collection.delete_one({
        "_id": ObjectId(annotation_id),
        "created_by": current_user["id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Annotation record not found")
    return {"success": True, "message": "Annotation deleted"}
