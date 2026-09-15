const express = require('express');
const router = express.Router();
const controller = require('../controllers/boxLocationsController');

router.get('/', controller.getAllBoxLocations);
router.delete('/:id', controller.deleteBoxLocations);

module.exports = router;
