import httpx
import base64
import logging
from typing import Any, List, Dict, Optional

import os

logger = logging.getLogger(__name__)

# Hugging Face Space URLs - can be overridden via environment variables
FEMORAL_API = os.getenv("FEMORAL_HF_API", "https://sam9198-femoral-head-detection.hf.space/predict")
ENDPLATES_API = os.getenv("ENDPLATES_HF_API", "https://sam9198-vertebral-endplate-detection.hf.space/predict")
HF_TOKEN = os.getenv("HF_TOKEN", "")

async def call_hf_predict(url: str, image_bytes: bytes) -> Any:
    """
    Call Hugging Face Space /predict endpoint.
    Tries multiple payload formats (multipart and JSON) to ensure compatibility.
    """
    base64_img = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:image/png;base64,{base64_img}"
    
    headers = {}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    
    async with httpx.AsyncClient(timeout=60.0, headers=headers) as client:
        # Attempt 1: Multipart with field 'file'
        try:
            files = {"file": ("image.png", image_bytes, "image/png")}
            response = await client.post(url, files=files)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"HF multipart/file attempt failed: {e}")

        # Attempt 2: Multipart with field 'image'
        try:
            files = {"image": ("image.png", image_bytes, "image/png")}
            response = await client.post(url, files=files)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"HF multipart/image attempt failed: {e}")

        # Attempt 3: JSON with 'image' data URL
        try:
            payload = {"image": data_url}
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"HF JSON/image-url attempt failed: {e}")

        # Attempt 4: JSON with 'image_data' base64
        try:
            payload = {"image_data": base64_img}
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"HF JSON/image-data-base64 attempt failed: {e}")

    raise Exception(f"All attempts to call HF API {url} failed.")

def extract_femoral_heads(data: Any) -> List[Dict]:
    """Extract femoral head coordinates from HF response."""
    # Gradio responses often wrap the result in a 'data' array
    if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
        payload = data["data"][0]
    else:
        payload = data

    detections = []
    
    def process_item(item):
        if isinstance(item, (list, tuple)) and len(item) >= 4:
            detections.append({
                "cx": float(item[0]),
                "cy": float(item[1]),
                "rx": float(item[2]),
                "ry": float(item[3]),
                "type": "circle",
                "label": "Femoral_Head"
            })
        elif isinstance(item, dict):
            # Check for coordinates in various possible field names
            cx = item.get("cx") or item.get("center_x") or item.get("x")
            cy = item.get("cy") or item.get("center_y") or item.get("y")
            rx = item.get("rx") or item.get("radius_x") or item.get("radius") or 20
            ry = item.get("ry") or item.get("radius_y") or item.get("radius") or 20
            
            if cx is not None and cy is not None:
                detections.append({
                    "cx": float(cx),
                    "cy": float(cy),
                    "rx": float(rx),
                    "ry": float(ry),
                    "type": "circle",
                    "label": "Femoral_Head"
                })

    # If payload is already a list of detections
    if isinstance(payload, list):
        for sub in payload:
            process_item(sub)
    # If payload is a dict, look for known result keys
    elif isinstance(payload, dict):
        for key in ["femoral_heads", "heads", "predictions", "detections"]:
            if key in payload and isinstance(payload[key], list):
                for sub in payload[key]:
                    process_item(sub)
                break
        else:
            # Fallback: process the payload itself as a potential item
            process_item(payload)
            
    return detections

def extract_endplates(data: Any) -> Dict:
    """Extract endplates from HF response."""
    if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
        payload = data["data"][0]
    else:
        payload = data

    if isinstance(payload, dict):
        if "endplates" in payload:
            return payload
        if "predictions" in payload:
            return {"endplates": payload["predictions"], **payload}
        return {"endplates": []}
    
    if isinstance(payload, list):
        return {"endplates": payload}
        
    return {"endplates": []}
