/**
 * routes/bookings.js — Resource Booking (time-slot with overlap validation)
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const bookingService = require('../services/bookingService');

const prisma = new PrismaClient();

// GET /api/bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { assetId, userId, status, from, to } = req.query;
    const bActorId = BigInt(req.user.id);

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

    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
