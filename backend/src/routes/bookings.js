/**
 * routes/bookings.js — Resource Booking (time-slot with overlap validation)
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const bookingService = require('../services/bookingService');

const prisma = new PrismaClient();
<<<<<<< HEAD
=======

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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a

// GET /api/bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { assetId, userId, status, from, to } = req.query;
    const bActorId = BigInt(req.user.id);

<<<<<<< HEAD
    let baseFilter = {};
    if (req.user.role === 'EMPLOYEE') {
      // Employees can see bookings of a specific asset (calendar view) or their own bookings
      if (!assetId) {
        baseFilter.userId = bActorId;
      }
    } else if (req.user.role === 'DEPT_HEAD') {
      if (!assetId && !userId && req.user.departmentId) {
        // Default to department employee bookings
        const bDeptId = BigInt(req.user.departmentId);
        baseFilter.user = { departmentId: bDeptId };
      }
    }

    const where = {
      ...baseFilter,
      ...(assetId && { assetId: BigInt(assetId) }),
      ...(userId && (req.user.role !== 'EMPLOYEE' || BigInt(userId) === bActorId) && { userId: BigInt(userId) }),
      ...(status && { status }),
      ...((from || to) && {
        startTime: {
          ...(from && { gte: new Date(from) }),
        },
        endTime: {
          ...(to && { lte: new Date(to) }),
        }
      })
    };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        asset: { select: { id: true, tag: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json(bookings);
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
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
<<<<<<< HEAD
    const booking = await prisma.booking.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        asset: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Security: employees can only view their own bookings
    if (req.user.role === 'EMPLOYEE' && booking.userId !== BigInt(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
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
<<<<<<< HEAD
=======
    const id = BigInt(req.params.id);
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
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

<<<<<<< HEAD
    // Retrieve booking
    const booking = await prisma.booking.findUnique({ where: { id: bBookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Security: verify owner or manager
    const isOwner = booking.userId === bActorId;
    const isManager = req.user.role === 'ADMIN' || req.user.role === 'ASSET_MANAGER';
    if (!isOwner && !isManager) {
      return res.status(403).json({ error: 'Access denied. You do not own this booking.' });
    }

    // Check for overlap, excluding this booking itself
    const conflicts = await prisma.booking.findMany({
      where: {
        assetId: booking.assetId,
        id: { not: bBookingId },
        status: { in: ['UPCOMING', 'ONGOING'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Overlaps with another existing booking' });
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: bBookingId },
        data: { startTime: start, endTime: end },
      });

      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'RESCHEDULED_BOOKING',
          entity: 'BOOKING',
          entityId: bBookingId,
          metadata: { startTime, endTime },
        },
      });

      return b;
    });

=======
    const updatedBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      
      if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

      const isOwner = booking.userId.toString() === actor.id.toString();
      const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
      
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
          actorId: BigInt(actor.id),
          action: 'RESCHEDULED_BOOKING',
          entity: 'BOOKING',
          entityId: id,
          metadata: { assetId: booking.assetId.toString(), oldStart: booking.startTime, oldEnd: booking.endTime, newStart: start, newEnd: end }
        }
      });

      return updated;
    });

>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
