const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const http     = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const PORT = parseInt(process.env.PORT || '5000', 10);

const app    = express();
const server = http.createServer(app);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow both Vite dev server and any localhost port (covers hot-reload changes)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile) or matching origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions)); // pre-flight for all routes

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Make io accessible in routes
app.set('io', io);

// ── Health check (useful for debugging connectivity) ──────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime().toFixed(1) + 's',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/workers',       require('./routes/workers'));
app.use('/api/sensors',       require('./routes/sensors'));
app.use('/api/claims',        require('./routes/claims'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/fraud',         require('./routes/fraud'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Socket.io events ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
  });
  socket.on('error', (err) => {
    console.error('[Socket] Error:', err.message);
  });
});

// ── MongoDB + Server startup ──────────────────────────────────────────────────
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // fail fast if Mongo is down
    });
    console.log('[DB] MongoDB connected →', process.env.MONGO_URI);
  } catch (err) {
    console.error('[DB] MongoDB connection FAILED:', err.message);
    console.error('[DB] Make sure MongoDB is running: mongod or MongoDB Compass');
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  });

  // Handle port already in use — kill-safe restart message
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use.`);
      console.error(`[Server] Run this to free it:`);
      console.error(`         netstat -ano | findstr :${PORT}`);
      console.error(`         taskkill /PID <pid> /F`);
    } else {
      console.error('[Server] Startup error:', err.message);
    }
    process.exit(1);
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down gracefully`);
  server.close(() => console.log('[Server] HTTP server closed'));
  await mongoose.connection.close();
  console.log('[DB] MongoDB connection closed');
  process.exit(0);
}

// ── Catch unhandled promise rejections ───────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});

startServer();

module.exports = { io };
