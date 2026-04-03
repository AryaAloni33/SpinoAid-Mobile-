"""
Femoral Head Detection Routes
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from model.femoral_detector import get_detector
import base64
import io

router = APIRouter(prefix="/api/femoral", tags=["femoral"])

@router.post("/detect")
async def detect_femoral_heads(file: UploadFile = File(...)):
    """
    Detect femoral heads in uploaded X-ray image
    
    Args:
        file: X-ray image file
        
    Returns:
        JSON with detection results
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read file content
        image_data = await file.read()
        
        # Get detector and run inference
        detector = get_detector()
        detections = detector.detect_femoral_heads(image_data)
        
        return JSONResponse(content={
            "success": True,
            "message": f"Detected {len(detections)} femoral heads",
            "detections": detections,
            "image_info": {
                "filename": file.filename,
                "size": len(image_data),
                "type": file.content_type
            }
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Detection failed: {str(e)}"
        )

@router.post("/detect-base64")
async def detect_femoral_heads_base64(request: dict):
    """
    Detect femoral heads from base64 encoded image
    
    Args:
        request: JSON with 'image_data' field containing base64 string
        
    Returns:
        JSON with detection results
    """
    if 'image_data' not in request:
        raise HTTPException(status_code=400, detail="Missing image_data field")
    
    try:
        # Decode base64
        image_data = base64.b64decode(request['image_data'])
        
        # Get detector and run inference
        detector = get_detector()
        detections = detector.detect_femoral_heads(image_data)
        
        return JSONResponse(content={
            "success": True,
            "message": f"Detected {len(detections)} femoral heads",
            "detections": detections
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Detection failed: {str(e)}"
        )

@router.get("/status")
async def get_model_status():
    """Get the current status of the femoral head detection model"""
    detector = get_detector()
    
    return JSONResponse(content={
        "model_loaded": detector.model is not None,
        "device": detector.device,
        "message": "Model ready for detection" if detector.model else "Using dummy predictions"
    })
