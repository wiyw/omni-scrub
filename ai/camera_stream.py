#!/usr/bin/env python3
"""
Camera Stream - MJPEG server for Omni-Scrub
Usage: camera_stream.py [ai]
  ai = 1 to enable YOLO overlay
"""

import sys
import os
import cv2
import time

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except:
    HAS_YOLO = False

model = None
if HAS_YOLO:
    for p in ['models/yolo26n.pt', 'yolov8n.pt', os.path.expanduser('~/models/yolo26n.pt')]:
        if os.path.exists(p):
            model = YOLO(p)
            break

camera = None
for dev in [0, 1, 2]:
    try:
        camera = cv2.VideoCapture(dev)
        if camera.isOpened():
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            camera.set(cv2.CAP_PROP_FPS, 15)
            print(f"Camera opened: {dev}", flush=True)
            break
    except:
        continue

include_ai = len(sys.argv) > 1 and sys.argv[1] == '1'

def process_frame(frame):
    if include_ai and model:
        try:
            results = model(frame, conf=0.4, verbose=False)
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        label = model.names[cls]
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                        cv2.putText(frame, f"{label} {conf:.1f}", (int(x1), int(y1) - 5),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        except:
            pass
    return frame

print("Starting stream...", flush=True)

while True:
    if camera and camera.isOpened():
        ret, frame = camera.read()
        if ret:
            if include_ai:
                frame = process_frame(frame)
            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            sys.stdout.buffer.write(b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            sys.stdout.buffer.flush()
    time.sleep(0.05)
