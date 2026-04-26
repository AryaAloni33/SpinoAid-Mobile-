"""
Vertebral Endplate Detection Routes
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import base64
from utils.hf_client import call_hf_predict, ENDPLATES_API, extract_endplates

router = APIRouter(prefix="/api/endplates", tags=["endplates"])

@router.post("/detect")
async def detect_endplates(file: UploadFile = File(...)):
    """
    Detect vertebral endplates in uploaded X-ray image
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        image_data = await file.read()
        hf_data = await call_hf_predict(ENDPLATES_API, image_data)
        result = extract_endplates(hf_data)
        
        return JSONResponse(content={
            "success": True,
            "message": f"Detection complete via AI",
            **result
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Detection failed: {str(e)}"
        )

@router.post("/detect-base64")
async def detect_endplates_base64(request: dict):
    """
    Detect vertebral endplates from base64 encoded image
    """
    if 'image_data' not in request:
        raise HTTPException(status_code=400, detail="Missing image_data field")
    
    try:
        image_data = base64.b64decode(request['image_data'])
        hf_data = await call_hf_predict(ENDPLATES_API, image_data)
        result = extract_endplates(hf_data)
        
        return JSONResponse(content={
            "success": True,
            "message": f"Detection complete via AI",
            **result
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Detection failed: {str(e)}"
        )
