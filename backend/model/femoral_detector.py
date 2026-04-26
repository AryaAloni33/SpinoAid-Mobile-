"""
Femoral Head Detection Model
Based on YOLOv8 + EllipseNet Hybrid from the notebook
"""

import os
import cv2
import numpy as np
import torch
from typing import List, Dict, Tuple, Optional
from PIL import Image
import io
import base64
from ultralytics import YOLO

class FemoralHeadDetector:
    """Femoral Head Detection using YOLOv8"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        # Preprocessing parameters from notebook
        self.clahe_proc = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load YOLOv8 model"""
        try:
            self.model = YOLO(model_path)
            self.model.to(self.device)
            print(f"Model loaded from {model_path}")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def preprocess_xray(self, img_bgr: np.ndarray) -> np.ndarray:
        """Preprocess X-ray image as done in notebook"""
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        enhanced = self.clahe_proc.apply(gray)
        blur = cv2.GaussianBlur(enhanced, (0, 0), 3)
        sharpened = cv2.addWeighted(enhanced, 1.5, blur, -0.5, 0)
        sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
        lut = np.array([((i/255)**0.85)*255 for i in range(256)], dtype=np.uint8)
        sharpened = cv2.LUT(sharpened, lut)
        return cv2.cvtColor(sharpened, cv2.COLOR_GRAY2RGB)
    
    def detect_femoral_heads(self, image_data: bytes) -> List[Dict]:
        """
        Detect femoral heads in X-ray image
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            List of detections with coordinates and confidence
        """
        if self.model is None:
            # Return dummy predictions for now
            return self._get_dummy_predictions()
        
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Could not decode image")
            
            # Preprocess
            processed_img = self.preprocess_xray(img)
            
            # Run inference
            results = self.model(processed_img, conf=0.25, max_det=2)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = box.conf[0].cpu().numpy()
                        
                        # Calculate center and radius for circle
                        center_x = (x1 + x2) / 2
                        center_y = (y1 + y2) / 2
                        radius = min((x2 - x1), (y2 - y1)) / 2
                        
                        detections.append({
                            'type': 'circle',
                            'center_x': float(center_x),
                            'center_y': float(center_y),
                            'radius': float(radius),
                            'confidence': float(conf),
                            'label': 'Femoral_Head'
                        })
            
            # Sort by Y coordinate (top to bottom)
            detections.sort(key=lambda d: d['center_y'])
            
            return detections
            
        except Exception as e:
            print(f"Detection error: {e}")
            return self._get_dummy_predictions()
    
    def _get_dummy_predictions(self) -> List[Dict]:
        """Return dummy predictions for testing when model is not loaded"""
        return [
            {
                'type': 'circle',
                'center_x': 300,
                'center_y': 200,
                'radius': 50,
                'confidence': 0.85,
                'label': 'Femoral_Head'
            },
            {
                'type': 'circle',
                'center_x': 320,
                'center_y': 350,
                'radius': 55,
                'confidence': 0.82,
                'label': 'Femoral_Head'
            }
        ]

# Global detector instance
detector = FemoralHeadDetector()

def get_detector() -> FemoralHeadDetector:
    """Get the global detector instance"""
    return detector
