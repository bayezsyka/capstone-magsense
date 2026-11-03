const express = require('express');
const router = express.Router();
const controller = require('../controllers/actuatorLogsController');

router.get('/latest', controller.getLatestActuatorLogs);
router.get('/', controller.getAllActuatorLogs);
router.post('/', controller.createActuatorLog);
router.delete('/:id', controller.deleteActuatorLogs);

module.exports = router;
