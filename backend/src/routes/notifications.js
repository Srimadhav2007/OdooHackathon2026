/**
 * routes/notifications.js — In-app notifications
 *
 * GET  /api/notifications           — Get current user's notifications
 * PUT  /api/notifications/:id/read  — Mark single notification as read
 * PUT  /api/notifications/read-all  — Mark all as read
 * DELETE /api/notifications/:id     — Delete notification
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Return notifications for req.user.id, ordered by createdAt DESC
    //  - ?isRead=false to get unread only
    //  - ?type= to filter by NotificationType
    //  - Include unreadCount in response
    res.json({ message: 'TODO: list notifications', userId: req.user.id });
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all  (must be before /:id)
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Set isRead = true for all user's notifications
    res.json({ message: 'TODO: mark all read' });
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Set notification.isRead = true; verify it belongs to req.user
    res.json({ message: 'TODO: mark read', id: req.params.id });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Delete notification; verify it belongs to req.user
    res.json({ message: 'TODO: delete notification', id: req.params.id });
  } catch (err) { next(err); }
});

module.exports = router;
