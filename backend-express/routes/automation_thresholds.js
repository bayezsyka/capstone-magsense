const express = require('express');
const router = express.Router();
const thresholdsController = require('../controllers/automationThresholdsController');

router.get('/', thresholdsController.getAllThresholds);
router.get('/:id', thresholdsController.getThresholdById);
router.post('/', thresholdsController.createThreshold);
router.put('/:id', thresholdsController.updateThreshold);
router.delete('/:id', thresholdsController.deleteThreshold);

module.exports = router;
