const express = require('express');
const router = express.Router();
const controller = require('../controllers/cvResultsController');

router.get('/', controller.getAllCvResults);
router.post('/scan-frame', controller.scanFrame);
router.delete('/:id', controller.deleteCvResults);

module.exports = router;
