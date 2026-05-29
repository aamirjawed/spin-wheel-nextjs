import './config/env.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Configs and routes
import { connectDB } from './config/db.js';
import superAdminRoutes from './routes/superAdmin.js';
import adminRoutes from './routes/admin.js';
import wheelRoutes from './routes/wheel.js';
import registerWheelSockets from './sockets/wheelSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
connectDB();

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve uploads folder static files
const projectRoot = path.join(__dirname, '..');
const uploadsPath = path.join(projectRoot, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wheel', wheelRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Save socket instance on app to access in routes if needed
app.set('io', io);

// Register Socket Events
registerWheelSockets(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads served from: ${uploadsPath}`);
});
