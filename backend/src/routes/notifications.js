/**
 * routes/notifications.js — In-app notifications
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { isRead, type } = req.query;
    const actor = req.user;

    let query = `
      SELECT 
        id, 
        recipient_id AS "recipientId", 
        type, 
        message, 
        is_read AS "isRead", 
        ref_id AS "refId", 
        ref_type AS "refType", 
        created_at AS "createdAt"
      FROM notification
      WHERE recipient_id = $1
    `;
    const params = [actor.id];

    if (isRead !== undefined) {
      const isReadVal = isRead === 'true' || isRead === '1';
      query += ` AND is_read = $${params.length + 1}`;
      params.push(isReadVal);
    }

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const notificationsRes = await pool.query(query, params);

    // Fetch unread count for user
    const unreadRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notification WHERE recipient_id = $1 AND is_read = false`,
      [actor.id]
    );

    res.json({
      notifications: notificationsRes.rows,
      unreadCount: unreadRes.rows[0].count
    });

  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all  (must be before /:id)
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const actor = req.user;

    await pool.query(
      `UPDATE notification SET is_read = true WHERE recipient_id = $1 AND is_read = false`,
      [actor.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const actor = req.user;

    // Check notification exists and belongs to actor
    const checkRes = await pool.query('SELECT recipient_id FROM notification WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (checkRes.rows[0].recipient_id.toString() !== actor.id.toString()) {
      return res.status(403).json({ error: 'Access denied. You cannot read this notification.' });
    }

    await pool.query(
      `UPDATE notification SET is_read = true WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const actor = req.user;

    // Check notification exists and belongs to actor
    const checkRes = await pool.query('SELECT recipient_id FROM notification WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (checkRes.rows[0].recipient_id.toString() !== actor.id.toString()) {
      return res.status(403).json({ error: 'Access denied. You cannot delete this notification.' });
    }

    await pool.query(
      `DELETE FROM notification WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
