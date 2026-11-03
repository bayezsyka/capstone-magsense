const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationsController');

router.get('/', controller.getAllNotifications);
router.get('/:id', controller.getNotificationById);
router.post('/', controller.createNotification);
router.put('/:id/read', controller.markAsRead);
router.delete('/:id', controller.deleteNotification);

module.exports = router;
