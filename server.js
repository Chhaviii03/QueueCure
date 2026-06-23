const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const queueService = require('./services/queueService');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queuecure';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));

const patientSubscriptions = new Map();

async function broadcastState() {
  const state = await queueService.getState();
  const publicState = queueService.buildPublicState(state);
  io.emit('queue:update', publicState);

  for (const [socketId, token] of patientSubscriptions.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      patientSubscriptions.delete(socketId);
      continue;
    }
    try {
      const view = await queueService.getPatientView(token);
      socket.emit('patient:update', view);
    } catch {
      /* ignore per-socket errors */
    }
  }
}

app.get('/api/queue', async (_req, res) => {
  try {
    const state = await queueService.getState();
    res.json(queueService.buildPublicState(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/patient/:token', async (req, res) => {
  try {
    const token = parseInt(req.params.token, 10);
    if (!Number.isFinite(token)) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    const view = await queueService.getPatientView(token);
    res.json(view);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const { name } = req.body || {};
    const result = await queueService.addPatient(name);
    await broadcastState();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/call-next', async (_req, res) => {
  try {
    const result = await queueService.callNext();
    await broadcastState();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/avg-minutes', async (req, res) => {
  try {
    const { minutes } = req.body || {};
    const state = await queueService.setManualAvg(minutes);
    await broadcastState();
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/reset', async (_req, res) => {
  try {
    const state = await queueService.resetQueue();
    await broadcastState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', async (socket) => {
  try {
    const state = await queueService.getState();
    socket.emit('queue:update', queueService.buildPublicState(state));
  } catch {
    socket.emit('queue:error', { message: 'Could not load queue state' });
  }

  socket.on('patient:subscribe', async (token) => {
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) return;
    patientSubscriptions.set(socket.id, parsed);
    try {
      const view = await queueService.getPatientView(parsed);
      socket.emit('patient:update', view);
    } catch {
      socket.emit('patient:error', { message: 'Could not load patient view' });
    }
  });

  socket.on('disconnect', () => {
    patientSubscriptions.delete(socket.id);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('MongoDB unavailable — using in-memory store for this session.');
    console.warn('For persistence, start MongoDB: docker compose up -d');
    queueService.setMemoryMode(true);
  }

  server.listen(PORT, () => {
    console.log(`Queue Cure running at http://localhost:${PORT}`);
    console.log(`  Receptionist: http://localhost:${PORT}/receptionist`);
    console.log(`  Waiting room: http://localhost:${PORT}/display?token=1`);
  });
}

start();
