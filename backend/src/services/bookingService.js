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

  if (end <= start) {
    throw Object.assign(new Error('End time must be after start time'), { status: 400 });
  }

<<<<<<< HEAD
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
=======
  return await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: BigInt(assetId) } });
    
    if (!asset) {
      throw Object.assign(new Error('Asset not found'), { status: 404 });
    }

    if (!asset.isBookable) {
      throw Object.assign(new Error('This asset is not bookable/reservable'), { status: 400 });
    }

    // Check overlaps
    const conflict = await tx.booking.findFirst({
      where: {
        assetId: BigInt(assetId),
        status: { in: ['UPCOMING', 'ONGOING'] },
        startTime: { lt: end },
        endTime: { gt: start }
      },
      orderBy: { startTime: 'asc' }
    });

    if (conflict) {
      const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      throw Object.assign(
        new Error(`Overlaps with existing booking ${fmt(conflict.startTime)}–${fmt(conflict.endTime)}`),
        { status: 409, conflict }
      );
    }

    const booking = await tx.booking.create({
      data: {
        assetId: BigInt(assetId),
        userId: BigInt(actor.id),
        startTime: start,
        endTime: end,
        status: 'UPCOMING',
        notes: notes || ''
      }
    });

    // Mark asset as reserved if it is currently available
    if (asset.status === 'AVAILABLE') {
      await tx.asset.update({
        where: { id: BigInt(assetId) },
        data: { status: 'RESERVED' }
      });
    }

    await tx.notification.create({
      data: {
        recipientId: BigInt(actor.id),
        type: 'BOOKING_CONFIRMED',
        message: `Booking confirmed for "${asset.name}".`,
        refId: booking.id,
        refType: 'BOOKING'
      }
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
    });

    await tx.activityLog.create({
      data: {
<<<<<<< HEAD
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
=======
        actorId: BigInt(actor.id),
        action: 'CREATED_BOOKING',
        entity: 'BOOKING',
        entityId: booking.id,
        metadata: { assetId, startTime, endTime }
      }
    });

    broadcastDashboardRefresh();
    return booking;
  });
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
}

/**
 * Cancel a booking.
 */
async function cancelBooking(bookingId, actor) {
<<<<<<< HEAD
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
=======
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: BigInt(bookingId) }
    });

    if (!booking) {
      throw Object.assign(new Error('Booking not found'), { status: 404 });
    }

    if (booking.status === 'CANCELLED') {
      throw Object.assign(new Error('Booking is already cancelled'), { status: 400 });
    }

    if (actor.role === 'EMPLOYEE' && booking.userId.toString() !== actor.id.toString()) {
      throw Object.assign(new Error('Access denied. You can only cancel your own bookings.'), { status: 403 });
    }

    const updatedBooking = await tx.booking.update({
      where: { id: BigInt(bookingId) },
      data: { status: 'CANCELLED' }
    });

    // Revert asset to AVAILABLE if no other bookings exist and it is currently RESERVED
    const activeBookingsCount = await tx.booking.count({
      where: {
        assetId: booking.assetId,
        status: { in: ['UPCOMING', 'ONGOING'] }
      }
    });

    if (activeBookingsCount === 0) {
      const asset = await tx.asset.findUnique({ where: { id: booking.assetId } });
      if (asset && asset.status === 'RESERVED') {
        await tx.asset.update({
          where: { id: booking.assetId },
          data: { status: 'AVAILABLE' }
        });
      }
    }

    await notificationService.send(
      booking.userId,
      'BOOKING_CANCELLED',
      `Your booking for asset ID ${booking.assetId} has been cancelled.`,
      booking.id,
      'BOOKING'
    );

    await tx.activityLog.create({
      data: {
        actorId: BigInt(actor.id),
        action: 'CANCELLED_BOOKING',
        entity: 'BOOKING',
        entityId: booking.id,
        metadata: { assetId: booking.assetId.toString() }
      }
    });

    broadcastDashboardRefresh();
    return updatedBooking;
  });
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
}

module.exports = { createBooking, cancelBooking };
