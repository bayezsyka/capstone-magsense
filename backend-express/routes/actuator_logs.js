const express = require('express');
const router = express.Router();
const controller = require('../controllers/actuatorLogsController');

router.get('/', controller.getAllActuatorLogs);
router.delete('/:id', controller.deleteActuatorLogs);

module.exports = router;
