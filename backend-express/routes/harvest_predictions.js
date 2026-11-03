const express = require('express');
const router = express.Router();
const controller = require('../controllers/harvestPredictionsController');

router.get('/latest', controller.getLatestHarvestPrediction);
router.get('/', controller.getAllHarvestPredictions);
router.post('/', controller.createHarvestPrediction);
router.delete('/:id', controller.deleteHarvestPredictions);

module.exports = router;
