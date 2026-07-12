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

<<<<<<< HEAD
    const where = {
      recipientId: bActorId,
      ...(unreadOnly === 'true' && { isRead: false }),
    };

    const list = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(list);
=======
    const where = { recipientId: BigInt(actor.id) };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true' || isRead === '1';
    }

    if (type) {
      where.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientId: BigInt(actor.id), isRead: false }
    });

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        recipientId: n.recipientId,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        refId: n.refId,
        refType: n.refType,
        createdAt: n.createdAt
      })),
      unreadCount
    });
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const bActorId = BigInt(req.user.id);

    await prisma.notification.updateMany({
<<<<<<< HEAD
      where: { recipientId: bActorId, isRead: false },
      data: { isRead: true },
=======
      where: { recipientId: BigInt(actor.id), isRead: false },
      data: { isRead: true }
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
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
=======
    const id = BigInt(req.params.id);
    const actor = req.user;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { recipientId: true }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipientId.toString() !== actor.id.toString()) {
      return res.status(403).json({ error: 'Access denied. You cannot read this notification.' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const actor = req.user;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { recipientId: true }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipientId.toString() !== actor.id.toString()) {
      return res.status(403).json({ error: 'Access denied. You cannot delete this notification.' });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({ message: 'Notification deleted successfully' });
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

module.exports = router;
