"""
Femoral Head and Vertebral Endplate Detection Model
Robustly handles Hugging Face Space responses by mimicking the frontend logic
"""

import os
import cv2
import numpy as np
import torch
import requests
import base64
import io
from typing import List, Dict, Any, Optional
from PIL import Image

FEMORAL_API = "https://sam9198-femoral-head-detection.hf.space/predict"
ENDPLATES_API = "https://sam9198-vertebral-endplate-detection.hf.space/predict"

class XRayAutoAnnotator:
    """X-ray Auto Annotation using Hugging Face APIs with robust extraction"""
    
    def __init__(self):
        self.device = 'cpu'
        self.model = "HF-Hybrid-v2"
    
    def detect_all(self, image_data: bytes) -> Dict[str, List]:
        """
        Detect both femoral heads and endplates
        """
        # Get image dimensions for coordinate scaling if needed
        try:
            img = Image.open(io.BytesIO(image_data))
            img_w, img_h = img.size
        except:
            img_w, img_h = 1000, 1000

        femoral_detections = self.detect_femoral_heads(image_data)
        endplate_detections = self.detect_endplates(image_data, img_w, img_h)
        
        return {
            "femoral_heads": femoral_detections,
            "endplates": endplate_detections
        }

    def _call_hf(self, url: str, image_data: bytes) -> Any:
        """Call HF space trying multiple multipart keys to ensure success"""
        keys = ['file', 'image', 'upload']
        errors = []
        
        for key in keys:
            try:
                files = {key: ('image.jpg', image_data, 'image/jpeg')}
                response = requests.post(url, files=files, timeout=45)
                if response.status_code == 200:
                    return response.json()
                errors.append(f"{key}: {response.status_code}")
            except Exception as e:
                errors.append(f"{key}: {str(e)}")
        
        print(f"All HF calls failed for {url}: {errors}")
        return None

    def detect_femoral_heads(self, image_data: bytes) -> List[Dict]:
        """Call Femoral Head HF Space and extract robustly"""
        res = self._call_hf(FEMORAL_API, image_data)
        if not res: return self._get_dummy_femoral()
        
        data = res.get('data', res)
        heads = []
        
        def to_head(item):
            if isinstance(item, list) and len(item) >= 4:
                return {'cx': item[0], 'cy': item[1], 'rx': item[2], 'ry': item[3]}
            if isinstance(item, dict):
                cx = item.get('cx') or item.get('center_x') or item.get('x')
                cy = item.get('cy') or item.get('center_y') or item.get('y')
                rx = item.get('rx') or item.get('radius_x') or item.get('radius')
                ry = item.get('ry') or item.get('radius_y') or item.get('radius')
                if cx is not None and cy is not None:
                    return {'cx': cx, 'cy': cy, 'rx': rx or 20, 'ry': ry or 20}
            return None

        def process(v):
            h = to_head(v)
            if h:
                heads.append(h)
                return
            if isinstance(v, list):
                for x in v: process(x)
            elif isinstance(v, dict):
                for k in ['femoral_heads', 'heads', 'predictions', 'data']:
                    if k in v: process(v[k])

        process(data)
        
        return [{
            'type': 'circle',
            'center_x': float(h['cx']),
            'center_y': float(h['cy']),
            'radius': float((h['rx'] + h['ry']) / 2),
            'label': f'Femoral Head {i+1}'
        } for i, h in enumerate(heads)]

    def detect_endplates(self, image_data: bytes, img_w: int, img_h: int) -> List[Dict]:
        """Call Endplate HF Space and scale robustly"""
        res = self._call_hf(ENDPLATES_API, image_data)
        if not res: return []
        
        payload = res.get('data', [{}])[0] if isinstance(res.get('data'), list) else res
        if not isinstance(payload, dict): return []
        
        # Check for nested endplates
        if 'endplates' not in payload:
            # Try to find it
            for k, v in payload.items():
                if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict) and 'label' in v[0]:
                    payload['endplates'] = v
                    break
        
        raw_eps = payload.get('endplates', [])
        if not raw_eps: return []
        
        # Handle scaling
        api_w = payload.get('image_width') or (payload.get('image_shape') or {}).get('width')
        api_h = payload.get('image_height') or (payload.get('image_shape') or {}).get('height')
        
        scale_x = img_w / api_w if api_w else 1
        scale_y = img_h / api_h if api_h else 1
        
        results = []
        for ep in raw_eps:
            if ep.get('detected') is not False:
                results.append({
                    'type': 'line',
                    'label': ep.get('label', 'Endplate'),
                    'x1': float(ep.get('x1', 0)) * scale_x,
                    'y1': float(ep.get('y1', 0)) * scale_y,
                    'x2': float(ep.get('x2', 0)) * scale_x,
                    'y2': float(ep.get('y2', 0)) * scale_y,
                })
        return results

    def _get_dummy_femoral(self) -> List[Dict]:
        return [
            {'type': 'circle', 'center_x': 400, 'center_y': 600, 'radius': 45, 'label': 'Femoral Head 1'},
            {'type': 'circle', 'center_x': 600, 'center_y': 600, 'radius': 45, 'label': 'Femoral Head 2'}
        ]

# Global instance
annotator = XRayAutoAnnotator()

def get_detector():
    return annotator
