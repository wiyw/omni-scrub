import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import * as path from 'path';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

interface ClientMessage {
  event: string;
  data?: Record<string, unknown>;
}

let arduinoPort: SerialPort | null = null;
let clients: Set<WebSocket> = new Set();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

function connectArduino() {
  SerialPort.list().then((ports) => {
    const arduinoPort2 = ports.find(p => 
      p.path.includes('COM') || p.path.includes('usbmodem') || p.path.includes('usbserial')
    );
    
    if (arduinoPort2) {
      arduinoPort = new SerialPort({
        path: arduinoPort2.path,
        baudRate: 115200,
      });

      const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

      parser.on('data', (data: string) => {
        try {
          const parsed = JSON.parse(data);
          broadcastToClients({
            event: 'arduino_data',
            data: parsed,
          });
        } catch (e) {
          console.log('Arduino:', data.trim());
        }
      });

      arduinoPort.on('error', (err) => {
        console.error('Arduino error:', err);
        setTimeout(connectArduino, 5000);
      });

      console.log(`Connected to Arduino on ${arduinoPort2.path}`);
    } else {
      console.log('No Arduino found, retrying in 5s...');
      setTimeout(connectArduino, 5000);
    }
  });
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

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString()) as ClientMessage;
      
      if (msg.event === 'command' && arduinoPort?.isOpen) {
        arduinoPort.write(JSON.stringify(msg.data) + '\n');
      }
      
      if (msg.event === 'sensor_request') {
        if (arduinoPort?.isOpen) {
          arduinoPort.write('GET_SENSORS\n');
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
  res.json({ success: true });
});

app.get('/api/arduino/connect', (req, res) => {
  SerialPort.list().then((ports) => {
    res.json({ ports: ports.map(p => p.path) });
  });
});

app.post('/api/arduino/send', (req, res) => {
  const { command } = req.body;
  if (arduinoPort?.isOpen) {
    arduinoPort.write(command + '\n');
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Arduino not connected' });
  }
});

server.listen(PORT, () => {
  console.log(`Omni-Scrub server running on http://localhost:${PORT}`);
  connectArduino();
});
