const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { verifyToken, requireAdmin } = require('../middlewares/auth');
const { schemas, validate } = require('../middlewares/validation');

router.post('/login', validate(schemas.userLogin), usersController.loginUser);

router.get('/', verifyToken, usersController.getAllUsers);
router.get('/:id', verifyToken, usersController.getUserById);
router.post('/', verifyToken, requireAdmin, validate(schemas.userRegistration), usersController.createUser);
router.put('/:id', verifyToken, requireAdmin, validate(schemas.userUpdate), usersController.updateUser);
router.delete('/:id', verifyToken, requireAdmin, usersController.deleteUser);

module.exports = router;
