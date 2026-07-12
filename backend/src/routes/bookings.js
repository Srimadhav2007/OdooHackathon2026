/**
 * routes/bookings.js — Resource Booking (time-slot with overlap validation)
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const bookingService = require('../services/bookingService');

const prisma = new PrismaClient();

// Helper to map booking row
function mapBookingRow(b) {
  return {
    id: b.id,
    assetId: b.assetId,
    userId: b.userId,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    notes: b.notes,
    createdAt: b.createdAt,
    asset: b.asset ? { id: b.asset.id, name: b.asset.name, tag: b.asset.tag } : null,
    user: b.user ? { id: b.user.id, name: b.user.name } : null
  };
}

// GET /api/bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { assetId, userId, status, from, to } = req.query;
    const bActorId = BigInt(req.user.id);

    const where = {};
    if (assetId) where.assetId = BigInt(assetId);
    if (userId) where.userId = BigInt(userId);
    if (status) where.status = status;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.endTime = { lte: new Date(to) };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, tag: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(bookings.map(mapBookingRow));
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings
router.post('/', authenticate, async (req, res, next) => {
  try {
    const result = await bookingService.createBooking(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, tag: true } },
        user: { select: { id: true, name: true } }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(mapBookingRow(booking));
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const result = await bookingService.cancelBooking(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/reschedule
router.put('/:id/reschedule', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { startTime, endTime } = req.body;
    const bBookingId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      
      if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

      const isOwner = booking.userId.toString() === req.user.id.toString();
      const isManager = req.user.role === 'ADMIN' || req.user.role === 'ASSET_MANAGER';
      
      if (!isOwner && !isManager) {
        throw Object.assign(new Error('Access denied. You are not authorized to reschedule this booking.'), { status: 403 });
      }

      if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
        throw Object.assign(new Error(`Cannot reschedule booking in status: ${booking.status}`), { status: 400 });
      }

      const conflict = await tx.booking.findFirst({
        where: {
          assetId: booking.assetId,
          id: { not: id },
          status: { in: ['UPCOMING', 'ONGOING'] },
          startTime: { lt: end },
          endTime: { gt: start }
        }
      });

      if (conflict) {
        const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        throw Object.assign(
          new Error(`Overlaps with existing booking ${fmt(conflict.startTime)}–${fmt(conflict.endTime)}`),
          { status: 409, conflict }
        );
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          startTime: start,
          endTime: end,
          status: 'UPCOMING'
        }
      });

      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'RESCHEDULED_BOOKING',
          entity: 'BOOKING',
          entityId: id,
          metadata: { assetId: booking.assetId.toString(), oldStart: booking.startTime, oldEnd: booking.endTime, newStart: start, newEnd: end }
        }
      });

      return updated;
    });

    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
