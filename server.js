"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const http_1 = require("http");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const AI_INTERVAL_MS = 500;
let bridgeProcess = null;
let yoloProcess = null;
let clients = new Set();
let sensorData = {};
let visionEnabled = false;
let cameraAiMode = false;
app.use(express_1.default.json());
app.use(express_1.default.static(path.join(__dirname, './public')));
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
        bridgeProcess = (0, child_process_1.spawn)('python3', [bridgeScript], { shell: false });
        bridgeProcess.stdout?.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    try {
                        const parsed = JSON.parse(line);
                        sensorData = parsed;
                        broadcastToClients({ event: 'arduino_data', data: parsed });
                    }
                    catch (e) {
                        console.log('Bridge:', line);
                    }
                }
            });
        });
        bridgeProcess.stderr?.on('data', (data) => {
            console.log('Bridge:', data.toString().trim());
        });
        bridgeProcess.on('close', () => {
            console.log('Bridge disconnected, retrying...');
            setTimeout(connectBridge, 3000);
        });
    }
    catch (e) {
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
        yoloProcess = (0, child_process_1.spawn)('python3', [yoloScript], {
            shell: true,
            env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });
        yoloProcess.stdout?.on('data', (data) => {
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
                        }
                        else if (parsed.type === 'status') {
                            console.log('YOLO:', parsed.message);
                        }
                    }
                    catch (e) { }
                }
            });
        });
        yoloProcess.stderr?.on('data', (data) => {
            console.log('YOLO:', data.toString().trim());
        });
        yoloProcess.on('close', () => {
            console.log('YOLO process exited, restarting...');
            if (visionEnabled)
                setTimeout(startYoloProcess, 2000);
        });
        console.log('YOLO process started');
    }
    catch (e) {
        console.log('Failed to start YOLO:', e);
    }
}
function sendToBridge(command) {
    if (bridgeProcess) {
        console.log('Sending to MCU:', command);
    }
}
function broadcastToClients(message) {
    const msg = JSON.stringify(message);
    clients.forEach(client => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
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
            const msg = JSON.parse(message.toString());
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
        }
        catch (e) {
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
    }
    catch (e) { }
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
        vision: visionEnabled
    });
});
app.post('/api/vision/toggle', (req, res) => {
    const { enabled } = req.body;
    visionEnabled = enabled === true;
    if (visionEnabled && !yoloProcess) {
        startYoloProcess();
    }
    res.json({ success: true, enabled: visionEnabled });
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
});
//# sourceMappingURL=server.js.map