const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Expose Socket.io to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.use('/api/tenants', verifyToken, tenantsRoutes);
app.use('/api/users', usersRoutes); // verifyToken applied inside routes/users.js to allow /login
app.use('/api/boxes', verifyToken, boxesRoutes);
app.use('/api/automation-thresholds', verifyToken, automationThresholdsRoutes);
app.use('/api/edge-sync', edgeSyncRoutes);
app.use('/api/sensor-data', verifyToken, sensorDataRoutes);
app.use('/api/actuator-logs', verifyToken, actuatorLogsRoutes);
app.use('/api/cv-results', verifyToken, cvResultsRoutes);
app.use('/api/harvest-predictions', verifyToken, harvestPredictionsRoutes);
app.use('/api/box-locations', verifyToken, boxLocationsRoutes);
app.use('/api/notifications', verifyToken, notificationsRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Smart Farming API Cloud is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// WebSocket connection handling & Mock Data Broadcast
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Simulate sending real-time sensor data every 3 seconds
    const interval = setInterval(() => {
        // Mock data matching dashboard layout
        const mockData = {
            timestamp: new Date().toISOString(),
            boxes: [
                { id: 1, temp: (26 + Math.random() * 2).toFixed(1), humidity: (70 + Math.random() * 5).toFixed(1) },
                { id: 2, temp: (27 + Math.random() * 2).toFixed(1), humidity: (75 + Math.random() * 5).toFixed(1) },
                { id: 3, temp: (26.5 + Math.random() * 2).toFixed(1), humidity: (72 + Math.random() * 5).toFixed(1) },
            ],
            currentBox: {
                airTemp: (27 + Math.random()).toFixed(2),
                airHumidity: (70 + Math.random() * 2).toFixed(2),
                mediaHumidity: (52 + Math.random() * 2).toFixed(2),
                actuators: {
                    heater: Math.random() > 0.5 ? 'ON' : 'OFF',
                    kipas: Math.random() > 0.5 ? 'ON' : 'OFF',
                    pompa: Math.random() > 0.5 ? 'ON' : 'OFF'
                }
            }
        };
        
        socket.emit('sensor-update', mockData);
    }, 3000);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        clearInterval(interval);
    });
});

server.listen(PORT, () => {
    console.log(`Server and WebSocket running on port ${PORT}`);
});
