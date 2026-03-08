#!/usr/bin/env python3
"""
YOLO Object Detection Runner for Omni-Scrub
Processes webcam frames and outputs detections as JSON
"""

import sys
import json
import time
import threading
import queue

try:
    import cv2
    from ultralytics import YOLO
    CV2_AVAILABLE = True
except ImportError as e:
    CV2_AVAILABLE = False
    print(json.dumps({"type": "status", "message": f"OpenCV not available: {e}"}), flush=True)

MODEL_PATH = "models/yolo26n.pt"
CONFIDENCE_THRESHOLD = 0.4

class YoloRunner:
    def __init__(self):
        self.model = None
        self.running = False
        self.frame_queue = queue.Queue(maxsize=2)
        self.detection_classes = [
            'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
            'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
            'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
            'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
            'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
            'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
            'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
            'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
            'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
            'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
        ]
        
    def load_model(self):
        if not CV2_AVAILABLE:
            return False
            
        try:
            import os
            search_paths = [
                MODEL_PATH,
                os.path.join(os.path.dirname(__file__), '..', 'models', 'yolo26n.pt'),
                os.path.join(os.path.dirname(__file__), 'models', 'yolo26n.pt'),
                os.path.expanduser('~/models/yolo26n.pt'),
                'yolov8n.pt'
            ]
            
            model_path = None
            for p in search_paths:
                if os.path.exists(p):
                    model_path = p
                    break
            
            if model_path:
                self.model = YOLO(model_path)
                print(json.dumps({"type": "status", "message": f"Loaded model: {model_path}"}), flush=True)
                return True
            else:
                print(json.dumps({"type": "status", "message": "Model not found, downloading yolov8n.pt..."}), flush=True)
                self.model = YOLO('yolov8n.pt')
                return True
                
        except Exception as e:
            print(json.dumps({"type": "status", "message": f"Model load error: {e}"}), flush=True)
            return False
    
    def open_camera(self):
        if not CV2_AVAILABLE:
            return None
            
        for device_id in [0, 1, 2]:
            try:
                cap = cv2.VideoCapture(device_id)
                if cap.isOpened():
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    cap.set(cv2.CAP_PROP_FPS, 15)
                    print(json.dumps({"type": "status", "message": f"Camera opened: {device_id}"}), flush=True)
                    return cap
            except:
                continue
        return None
    
    def detect_objects(self, frame):
        if not self.model:
            return []
            
        try:
            results = self.model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0].cpu().numpy())
                        cls = int(box.cls[0].cpu().numpy())
                        
                        detections.append({
                            "label": self.detection_classes[cls] if cls < len(self.detection_classes) else f"class_{cls}",
                            "confidence": round(conf, 2),
                            "x": int(x1),
                            "y": int(y1),
                            "w": int(x2 - x1),
                            "h": int(y2 - y1)
                        })
            
            return detections
            
        except Exception as e:
            print(json.dumps({"type": "status", "message": f"Detection error: {e}"}), flush=True)
            return []
    
    def run(self):
        if not CV2_AVAILABLE:
            print(json.dumps({"type": "status", "message": "Running in simulation mode (no OpenCV)"}), flush=True)
            while True:
                time.sleep(0.5)
                import random
                demo_objs = ['person', 'chair', 'bottle', 'cup', 'book']
                detections = []
                for _ in range(random.randint(0, 2)):
                    detections.append({
                        "label": random.choice(demo_objs),
                        "confidence": round(random.uniform(0.5, 0.95), 2),
                        "x": random.randint(50, 400),
                        "y": random.randint(50, 300),
                        "w": random.randint(40, 100),
                        "h": random.randint(40, 120)
                    })
                print(json.dumps({"type": "detections", "detections": detections}), flush=True)
            return
            
        if not self.load_model():
            print(json.dumps({"type": "status", "message": "Failed to load model, using simulation"}), flush=True)
        
        camera = self.open_camera()
        
        if not camera:
            print(json.dumps({"type": "status", "message": "No camera, using simulation"}), flush=True)
            while True:
                time.sleep(0.5)
                import random
                demo_objs = ['person', 'chair', 'bottle', 'cup', 'book']
                detections = []
                for _ in range(random.randint(0, 2)):
                    detections.append({
                        "label": random.choice(demo_objs),
                        "confidence": round(random.uniform(0.5, 0.95), 2),
                        "x": random.randint(50, 400),
                        "y": random.randint(50, 300),
                        "w": random.randint(40, 100),
                        "h": random.randint(40, 120)
                    })
                print(json.dumps({"type": "detections", "detections": detections}), flush=True)
            return
        
        print(json.dumps({"type": "status", "message": "Starting detection loop"}), flush=True)
        
        frame_count = 0
        skip_frames = 2
        
        while True:
            ret, frame = camera.read()
            if not ret:
                camera = self.open_camera()
                if not camera:
                    time.sleep(1)
                    continue
                continue
            
            frame_count += 1
            if frame_count % (skip_frames + 1) != 0:
                continue
            
            detections = self.detect_objects(frame)
            
            if detections:
                print(json.dumps({"type": "detections", "detections": detections}), flush=True)
            
            time.sleep(0.033)

if __name__ == "__main__":
    runner = YoloRunner()
    runner.run()
