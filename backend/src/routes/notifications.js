/**
 * routes/notifications.js — Notifications & real-time events
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const bActorId = BigInt(req.user.id);
    const { unreadOnly } = req.query;

    const where = {
      recipientId: bActorId,
      ...(unreadOnly === 'true' && { isRead: false }),
    };

    const list = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(list);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const bActorId = BigInt(req.user.id);

    await prisma.notification.updateMany({
      where: { recipientId: bActorId, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);

    const notif = await prisma.notification.findUnique({ where: { id: bId } });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.recipientId !== bActorId) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.notification.update({
      where: { id: bId },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
