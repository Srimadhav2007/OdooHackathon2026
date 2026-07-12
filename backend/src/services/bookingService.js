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
    });

    await tx.activityLog.create({
      data: {
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
}

/**
 * Cancel a booking.
 */
async function cancelBooking(bookingId, actor) {
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
}

module.exports = { createBooking, cancelBooking };
