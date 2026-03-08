import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createHttpServer } from 'http';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const app = express();
const server = createHttpServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const AI_INTERVAL_MS = 500;

interface ClientMessage {
  event: string;
  data?: Record<string, unknown>;
}

let bridgeProcess: ReturnType<typeof spawn> | null = null;
let yoloProcess: ReturnType<typeof spawn> | null = null;
let qwenProcess: ChildProcessWithoutNullStreams | null = null;
let cameraProcess: ReturnType<typeof spawn> | null = null;
let clients: Set<WebSocket> = new Set();
let sensorData: Record<string, unknown> = {};
let visionEnabled = false;
let qwenReady = false;
let cameraAiMode = false;

app.use(express.json());
app.use(express.static(path.join(__dirname, './public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'));
});

function connectBridge() {
  const bridgeScript = path.join(__dirname, 'python', 'bridge.py');
  
  if (!fs.existsSync(bridgeScript)) {
    console.log('Bridge script not found, running in simulation mode');
    return;
  }

  try {
    bridgeProcess = spawn('python3', [bridgeScript], { 
      shell: false
    });

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

function startYoloProcess() {
  const modelsDir = path.join(__dirname, 'models');
  const yoloScript = path.join(__dirname, 'ai', 'yolo_runner.py');
  
  if (!fs.existsSync(yoloScript)) {
    console.log('YOLO runner not found, using simulation mode');
    return;
  }

  try {
    yoloProcess = spawn('python3', [yoloScript], { 
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    yoloProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim() && line.startsWith('{')) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'detections') {
              broadcastToClients({ 
                event: 'vision_detections', 
                data: { detections: parsed.detections } 
              });
            } else if (parsed.type === 'status') {
              console.log('YOLO:', parsed.message);
            }
          } catch (e) {}
        }
      });
    });

    yoloProcess.stderr?.on('data', (data: Buffer) => {
      console.log('YOLO:', data.toString().trim());
    });

    yoloProcess.on('close', () => {
      console.log('YOLO process exited, restarting...');
      if (visionEnabled) setTimeout(startYoloProcess, 2000);
    });

    console.log('YOLO process started');
  } catch (e) {
    console.log('Failed to start YOLO:', e);
  }
}

function startQwenProcess() {
  const qwenScript = path.join(__dirname, 'ai', 'qwen_runner.py');
  
  if (!fs.existsSync(qwenScript)) {
    console.log('Qwen runner not found');
    return;
  }

  try {
    qwenProcess = spawn('python3', [qwenScript], { 
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    qwenProcess.stdout?.on('data', (data: Buffer) => {
      console.log('Qwen:', data.toString().trim());
    });

    qwenProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg.includes('ready') || msg.includes('Done')) {
        qwenReady = true;
      }
      console.log('Qwen:', msg);
    });

    qwenProcess.on('close', () => {
      console.log('Qwen process exited');
      qwenReady = false;
      setTimeout(startQwenProcess, 5000);
    });

    console.log('Qwen process starting...');
  } catch (e) {
    console.log('Failed to start Qwen:', e);
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

      if (msg.event === 'vision_enable') {
        visionEnabled = msg.data?.enabled === true;
        if (visionEnabled && !yoloProcess) {
          startYoloProcess();
        }
        broadcastToClients({ event: 'vision_status', data: { enabled: visionEnabled } });
      }

      if (msg.event === 'ai_query' && qwenProcess && qwenReady) {
        const query = msg.data?.query as string;
        if (query) {
          qwenProcess.stdin.write(query + '\n');
        }
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
    fs.writeFileSync(path.join(__dirname, 'map.json'), JSON.stringify({ zones, roomPolygon }, null, 2));
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

app.get('/api/ai/status', (req, res) => {
  res.json({
    yolo: yoloProcess !== null,
    qwen: qwenReady,
    vision: visionEnabled
  });
});

app.post('/api/ai/query', (req, res) => {
  const { query } = req.body;
  
  if (!qwenProcess || !qwenReady) {
    res.json({ success: false, error: 'Qwen not ready' });
    return;
  }

  try {
    qwenProcess.stdin.write(query + '\n');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: String(e) });
  }
});

app.post('/api/vision/toggle', (req, res) => {
  const { enabled } = req.body;
  visionEnabled = enabled === true;
  
  if (visionEnabled && !yoloProcess) {
    startYoloProcess();
  }
  
  res.json({ success: true, enabled: visionEnabled });
});

function startCameraProcess() {
  const camScript = path.join(__dirname, 'ai', 'camera_stream.py');
  
  if (!fs.existsSync(camScript)) {
    console.log('Camera stream script not found');
    return;
  }

  try {
    cameraProcess = spawn('python3', [camScript], {
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    cameraProcess.stderr?.on('data', (data: Buffer) => {
      console.log('Camera:', data.toString().trim());
    });

    cameraProcess.on('close', () => {
      console.log('Camera process exited, restarting...');
      setTimeout(startCameraProcess, 3000);
    });

    console.log('Camera process started');
  } catch (e) {
    console.log('Failed to start camera:', e);
  }
}

app.get('/api/camera/stream', (req, res) => {
  const aiMode = req.query.ai === 'true';
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache');
  
  const scriptPath = path.join(__dirname, 'ai', 'camera_stream.py');
  const aiArg = aiMode ? '1' : '0';
  
  const proc = spawn('python3', [scriptPath, aiArg], { shell: false });
  
  proc.stdout.on('data', (data: Buffer) => {
    if (!res.writableEnded) {
      res.write(data);
    }
  });
  
  proc.on('close', () => {
    if (!res.writableEnded) {
      res.end();
    }
  });
  
  req.on('close', () => {
    proc.kill();
  });
});

app.get('/api/camera/status', (req, res) => {
  res.json({
    available: cameraProcess !== null,
    aiMode: cameraAiMode
  });
});

app.post('/api/camera/ai', (req, res) => {
  const { enabled } = req.body;
  cameraAiMode = enabled === true;
  res.json({ success: true, aiMode: cameraAiMode });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   Omni-Scrub Server with AI             ║
║   Running on: http://0.0.0.0:${PORT}       ║
║   Access from: http://<YOUR_IP>:${PORT}   ║
╚═══════════════════════════════════════════╝
  `);
  connectBridge();
  startQwenProcess();
  startCameraProcess();
});
