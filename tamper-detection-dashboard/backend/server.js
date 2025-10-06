import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import devicesRouter from './routes/devices.js';
import eventsRouter from './routes/events.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: false }));
app.use(express.json());

// Socket.IO
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('start-monitoring', (payload) => {
    console.log('start-monitoring', payload);
    socket.emit('system-status', { status: 'Monitoring started', ts: Date.now() });
  });

  socket.on('stop-monitoring', (payload) => {
    console.log('stop-monitoring', payload);
    socket.emit('system-status', { status: 'Monitoring stopped', ts: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
});

// Expose io to routes via app locals
app.locals.io = io;

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.use('/api/devices', devicesRouter);
app.use('/api/events', eventsRouter);

// Error handling
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Error handler:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

// DB connection and server start
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tamper-detection';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });


