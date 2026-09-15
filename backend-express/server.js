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

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const tenantsRoutes = require('./routes/tenants');
const usersRoutes = require('./routes/users');
const boxesRoutes = require('./routes/boxes');
const automationThresholdsRoutes = require('./routes/automation_thresholds');
const edgeSyncRoutes = require('./routes/edge_sync');

app.use('/api/tenants', tenantsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/boxes', boxesRoutes);
app.use('/api/automation-thresholds', automationThresholdsRoutes);
app.use('/api/edge-sync', edgeSyncRoutes);

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
