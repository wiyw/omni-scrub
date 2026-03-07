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
const serialport_1 = require("serialport");
const parser_readline_1 = require("@serialport/parser-readline");
const path = __importStar(require("path"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
let arduinoPort = null;
let clients = new Set();
app.use(express_1.default.json());
app.use(express_1.default.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});
function connectArduino() {
    serialport_1.SerialPort.list().then((ports) => {
        const arduinoPort2 = ports.find(p => p.path.includes('COM') || p.path.includes('usbmodem') || p.path.includes('usbserial'));
        if (arduinoPort2) {
            arduinoPort = new serialport_1.SerialPort({
                path: arduinoPort2.path,
                baudRate: 115200,
            });
            const parser = arduinoPort.pipe(new parser_readline_1.ReadlineParser({ delimiter: '\n' }));
            parser.on('data', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    broadcastToClients({
                        event: 'arduino_data',
                        data: parsed,
                    });
                }
                catch (e) {
                    console.log('Arduino:', data.trim());
                }
            });
            arduinoPort.on('error', (err) => {
                console.error('Arduino error:', err);
                setTimeout(connectArduino, 5000);
            });
            console.log(`Connected to Arduino on ${arduinoPort2.path}`);
        }
        else {
            console.log('No Arduino found, retrying in 5s...');
            setTimeout(connectArduino, 5000);
        }
    });
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
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message.toString());
            if (msg.event === 'command' && arduinoPort?.isOpen) {
                arduinoPort.write(JSON.stringify(msg.data) + '\n');
            }
            if (msg.event === 'sensor_request') {
                if (arduinoPort?.isOpen) {
                    arduinoPort.write('GET_SENSORS\n');
                }
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
    res.json({ success: true });
});
app.get('/api/arduino/connect', (req, res) => {
    serialport_1.SerialPort.list().then((ports) => {
        res.json({ ports: ports.map(p => p.path) });
    });
});
app.post('/api/arduino/send', (req, res) => {
    const { command } = req.body;
    if (arduinoPort?.isOpen) {
        arduinoPort.write(command + '\n');
        res.json({ success: true });
    }
    else {
        res.status(500).json({ error: 'Arduino not connected' });
    }
});
server.listen(PORT, () => {
    console.log(`Omni-Scrub server running on http://localhost:${PORT}`);
    connectArduino();
});
//# sourceMappingURL=server.js.map