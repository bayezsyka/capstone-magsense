const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const routesDir = path.join(__dirname, 'routes');

const endpoints = [
    { name: 'sensorData', table: 'sensor_data', columns: 'id, box_id, air_temp, air_humidity, media_humidity, timestamp', routerName: 'sensor_data' },
    { name: 'actuatorLogs', table: 'actuator_logs', columns: 'id, box_id, type, status, timestamp', routerName: 'actuator_logs' },
    { name: 'cvResults', table: 'cv_results', columns: 'id, box_id, dominant_phase, confidence_score, detection_counts, timestamp', routerName: 'cv_results' },
    { name: 'harvestPredictions', table: 'harvest_predictions', columns: 'id, box_id, estimated_days, urgency_level, timestamp', routerName: 'harvest_predictions' },
    { name: 'boxLocations', table: 'box_locations', columns: 'id, box_id, floor_level, created_at', routerName: 'box_locations' }
];

endpoints.forEach(ep => {
    const CapitalName = ep.name.charAt(0).toUpperCase() + ep.name.slice(1);
    
    // Controller
    const controllerCode = `const pool = require('../db');

exports.getAll${CapitalName} = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT ${ep.columns} FROM ${ep.table} ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch ${ep.table}' });
    }
};

exports.delete${CapitalName} = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM ${ep.table} WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};
`;
    fs.writeFileSync(path.join(controllersDir, `${ep.name}Controller.js`), controllerCode);

    // Route
    const routeCode = `const express = require('express');
const router = express.Router();
const controller = require('../controllers/${ep.name}Controller');

router.get('/', controller.getAll${CapitalName});
router.delete('/:id', controller.delete${CapitalName});

module.exports = router;
`;
    fs.writeFileSync(path.join(routesDir, `${ep.routerName}.js`), routeCode);
});

// Notifications (has PUT)
const notifCode = `const pool = require('../db');

exports.getAllNotifications = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, tenant_id, message, is_read, timestamp FROM notifications ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};
`;
fs.writeFileSync(path.join(controllersDir, 'notificationsController.js'), notifCode);

const notifRouteCode = `const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationsController');

router.get('/', controller.getAllNotifications);
router.put('/:id/read', controller.markAsRead);
router.delete('/:id', controller.deleteNotification);

module.exports = router;
`;
fs.writeFileSync(path.join(routesDir, 'notifications.js'), notifRouteCode);

console.log("Done generating controllers and routes.");
