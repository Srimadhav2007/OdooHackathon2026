/**
 * services/bookingService.js
 * Overlap validation for resource bookings.
 */

const { PrismaClient } = require('@prisma/client');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Create a booking after validating for overlaps.
 *
 * @param {object} data - { assetId, startTime, endTime, notes? }
 * @param {object} actor - req.user
 */
async function createBooking(data, actor) {
  const { assetId, startTime, endTime, notes } = data;

  if (!assetId || !startTime || !endTime) {
    throw Object.assign(new Error('Asset ID, start time, and end time are required'), { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  // 1. Validate: end > start
  if (end <= start) {
    throw Object.assign(new Error('End time must be after start time'), { status: 400 });
  }

  const bAssetId = BigInt(assetId);
  const bActorId = BigInt(actor.id);

  // 2. Fetch asset; verify isBookable = true
  const asset = await prisma.asset.findUnique({ where: { id: bAssetId } });
  if (!asset) {
    throw Object.assign(new Error('Asset not found'), { status: 404 });
  }
  if (!asset.isBookable) {
    throw Object.assign(new Error('Asset is not marked as bookable'), { status: 400 });
  }

  // 3. Check overlapping bookings:
  // A.startTime < B.endTime AND A.endTime > B.startTime
  const conflicts = await prisma.booking.findMany({
    where: {
      assetId: bAssetId,
      status: { in: ['UPCOMING', 'ONGOING'] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: { user: { select: { name: true } } }
  });

  // 4. If conflicts exist, throw conflict error
  if (conflicts.length > 0) {
    const c = conflicts[0];
    const fmt = (d) => d.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    throw Object.assign(
      new Error(`Overlaps with existing booking for ${c.user?.name || 'user'} from ${fmt(c.startTime)} to ${fmt(c.endTime)}`),
      { status: 409, conflict: c }
    );
  }

  // 5. Create booking & log activity
  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        assetId: bAssetId,
        userId: bActorId,
        startTime: start,
        endTime: end,
        status: 'UPCOMING',
        notes: notes || null,
      },
    });

    await tx.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'CREATED_BOOKING',
        entity: 'BOOKING',
        entityId: b.id,
        metadata: { assetId: bAssetId.toString(), startTime, endTime },
      },
    });

    return b;
  });

  // 6. Broadcast dashboard refresh
  broadcastDashboardRefresh();

  return booking;
}

/**
 * Cancel a booking.
 */
async function cancelBooking(bookingId, actor) {
  const bBookingId = BigInt(bookingId);
  const bActorId = BigInt(actor.id);

  const booking = await prisma.booking.findUnique({
    where: { id: bBookingId }
  });

  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { status: 404 });
  }

  // Verify ownership or manager role
  const isOwner = booking.userId === bActorId;
  const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
  if (!isOwner && !isManager) {
    throw Object.assign(new Error('Access denied. You do not own this booking.'), { status: 403 });
  }

  const updatedBooking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: bBookingId },
      data: { status: 'CANCELLED' }
    });

    await tx.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'CANCELLED_BOOKING',
        entity: 'BOOKING',
        entityId: bBookingId,
      },
    });

    return b;
  });

  // Broadcast dashboard refresh
  broadcastDashboardRefresh();

  return updatedBooking;
}

module.exports = { createBooking, cancelBooking };
