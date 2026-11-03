const express = require('express');
const router = express.Router();
const controller = require('../controllers/sensorDataController');

router.get('/latest', controller.getLatestSensorData);
router.get('/history', controller.getSensorHistory);
router.get('/', controller.getAllSensorData);
router.post('/', controller.createSensorData);
router.delete('/:id', controller.deleteSensorData);

module.exports = router;
