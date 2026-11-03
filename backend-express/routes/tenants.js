const express = require('express');
const router = express.Router();
const tenantsController = require('../controllers/tenantsController');
const { requireAdmin } = require('../middlewares/auth');

router.get('/', tenantsController.getAllTenants);
router.get('/:id', tenantsController.getTenantById);
router.post('/', requireAdmin, tenantsController.createTenant);
router.put('/:id', requireAdmin, tenantsController.updateTenant);
router.delete('/:id', requireAdmin, tenantsController.deleteTenant);

module.exports = router;
