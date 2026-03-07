import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createHttpServer } from 'http';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const app = express();
const server = createHttpServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

interface ClientMessage {
  event: string;
  data?: Record<string, unknown>;
}

let bridgeProcess: ReturnType<typeof spawn> | null = null;
let clients: Set<WebSocket> = new Set();
let sensorData: Record<string, unknown> = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, './public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'));
});

function connectBridge() {
  try {
    bridgeProcess = spawn('python3', ['-c', `
import serial
import json
import sys

# Try to find the Bridge serial port
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
    except:
        continue

if not ser:
    print("No serial port found for Bridge", file=sys.stderr)
    sys.exit(1)

while True:
    line = ser.readline()
    if line:
        print(line.decode('utf-8', errors='ignore').strip())
`], { shell: true });

    bridgeProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            sensorData = parsed;
            broadcastToClients({ event: 'arduino_data', data: parsed });
          } catch (e) {
            console.log('Bridge:', line);
          }
        }
      });
    });

    bridgeProcess.stderr?.on('data', (data: Buffer) => {
      console.log('Bridge:', data.toString().trim());
    });

    bridgeProcess.on('close', () => {
      console.log('Bridge disconnected, retrying...');
      setTimeout(connectBridge, 3000);
    });

  } catch (e) {
    console.log('Bridge not available, running in simulation mode');
  }
}

function sendToBridge(command: string) {
  if (bridgeProcess) {
    console.log('Sending to MCU:', command);
  }
}

function broadcastToClients(message: ClientMessage) {
  const msg = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  if (Object.keys(sensorData).length > 0) {
    ws.send(JSON.stringify({ event: 'arduino_data', data: sensorData }));
  }

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString()) as ClientMessage;
      
      if (msg.event === 'command') {
        const cmd = JSON.stringify(msg.data);
        sendToBridge(cmd);
      }
      
      if (msg.event === 'sensor_request') {
        broadcastToClients({ event: 'arduino_data', data: sensorData });
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

app.post('/api/map/save', (req, res) => {
  const { zones, roomPolygon } = req.body;
  console.log('Map saved:', { zones: zones?.length, roomPolygon: roomPolygon?.length });
  
  try {
    fs.writeFileSync('/home/root/omni-scrub/map.json', JSON.stringify({ zones, roomPolygon }, null, 2));
  } catch (e) {}
  
  res.json({ success: true });
});

app.get('/api/arduino/status', (req, res) => {
  res.json({ 
    connected: bridgeProcess !== null,
    sensorData
  });
});

app.post('/api/arduino/send', (req, res) => {
  const { command } = req.body;
  sendToBridge(command);
  res.json({ success: true });
});

app.get('/api/sensors', (req, res) => {
  res.json(sensorData);
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Omni-Scrub server running on http://0.0.0.0:${PORT}`);
  console.log('Access from other devices on your network');
  connectBridge();
});
