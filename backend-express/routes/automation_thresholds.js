const express = require('express');
const router = express.Router();
const thresholdsController = require('../controllers/automationThresholdsController');

const { schemas, validate } = require('../middlewares/validation');

router.get('/', thresholdsController.getAllThresholds);
router.get('/:id', thresholdsController.getThresholdById);
router.post('/', validate(schemas.automationThreshold), thresholdsController.createThreshold);
router.put('/:id', validate(schemas.automationThreshold), thresholdsController.updateThreshold);
router.delete('/:id', thresholdsController.deleteThreshold);

module.exports = router;
