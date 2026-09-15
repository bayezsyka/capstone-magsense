const express = require('express');
const router = express.Router();
const boxesController = require('../controllers/boxesController');

router.get('/', boxesController.getAllBoxes);
router.get('/:id', boxesController.getBoxById);
router.post('/', boxesController.createBox);
router.put('/:id', boxesController.updateBox);
router.delete('/:id', boxesController.deleteBox);

module.exports = router;
