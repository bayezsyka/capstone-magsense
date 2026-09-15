const express = require('express');
const router = express.Router();
const controller = require('../controllers/sensorDataController');

router.get('/', controller.getAllSensorData);
router.delete('/:id', controller.deleteSensorData);

module.exports = router;
