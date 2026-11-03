const express = require('express');
const router = express.Router();
const edgeSyncController = require('../controllers/edgeSyncController');

router.get('/history', edgeSyncController.getSyncHistory);
router.post('/', edgeSyncController.syncData);

module.exports = router;
