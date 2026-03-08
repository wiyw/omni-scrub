#!/usr/bin/env python3
"""
Arduino Bridge - communicates with Arduino MCU over serial
"""

import serial
import json
import sys
import time

ports = [
    '/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyUSB0', '/dev/ttyUSB1',
    '/dev/ttyS0', '/dev/ttyS1', '/dev/ttyXRCE0'
]

ser = None
for p in ports:
    try:
        ser = serial.Serial(p, 115200, timeout=1)
        print(f"Connected to {p}", file=sys.stderr)
        break
    except Exception as e:
        continue

if not ser:
    print("No serial port found for Bridge", file=sys.stderr)
    sys.exit(1)

while True:
    try:
        line = ser.readline()
        if line:
            print(line.decode('utf-8', errors='ignore').strip())
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        time.sleep(1)
