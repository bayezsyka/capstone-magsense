const express = require('express');
const router = express.Router();
const controller = require('../controllers/harvestPredictionsController');

router.get('/', controller.getAllHarvestPredictions);
router.delete('/:id', controller.deleteHarvestPredictions);

module.exports = router;
