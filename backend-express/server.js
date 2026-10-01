const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://capstone.sangkolo.my.id',
  'http://capstone.sangkolo.my.id',
  'http://192.168.1.112:3000',
  'http://192.168.1.112:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('sangkolo.my.id')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('sangkolo.my.id')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Expose Socket.io to routes and controllers
app.set('io', io);

const PORT = process.env.PORT || 5000;

const { verifyToken } = require('./middlewares/auth');

// Routes
const tenantsRoutes = require('./routes/tenants');
const usersRoutes = require('./routes/users');
const boxesRoutes = require('./routes/boxes');
const automationThresholdsRoutes = require('./routes/automation_thresholds');
const edgeSyncRoutes = require('./routes/edge_sync');
const sensorDataRoutes = require('./routes/sensor_data');
const actuatorLogsRoutes = require('./routes/actuator_logs');
const cvResultsRoutes = require('./routes/cv_results');
const harvestPredictionsRoutes = require('./routes/harvest_predictions');
const boxLocationsRoutes = require('./routes/box_locations');
const notificationsRoutes = require('./routes/notifications');
const usersController = require('./controllers/usersController');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/tenants', verifyToken, tenantsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/boxes', verifyToken, boxesRoutes);
app.use('/api/automation-thresholds', verifyToken, automationThresholdsRoutes);
app.use('/api/edge-sync', edgeSyncRoutes);
app.use('/api/sensor-data', verifyToken, sensorDataRoutes);
app.use('/api/actuator-logs', verifyToken, actuatorLogsRoutes);
app.use('/api/cv-results', verifyToken, cvResultsRoutes);
app.use('/api/harvest-predictions', verifyToken, harvestPredictionsRoutes);
app.use('/api/box-locations', verifyToken, boxLocationsRoutes);
app.use('/api/notifications', verifyToken, notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Direct /api/profile aliases
app.get('/api/profile', verifyToken, usersController.getProfile);
app.put('/api/profile', verifyToken, usersController.updateProfile);
app.put('/api/profile/password', verifyToken, usersController.updatePassword);

// Root healthcheck
app.get('/', (req, res) => {
  res.json({ message: 'Smart Farming Central API is active', status: 'healthy' });
});

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`[SERVER] Central Backend & WebSocket running on port ${PORT}`);
});
