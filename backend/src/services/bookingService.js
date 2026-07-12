/**
 * services/bookingService.js
 * Overlap validation for resource bookings.
 *
 * KEY RULE: Two bookings for the same asset cannot have overlapping time ranges.
 * Boundary touching (end === start of another) IS ALLOWED.
 *
 * Overlap condition (A overlaps B) iff:
 *   A.startTime < B.endTime AND A.endTime > B.startTime
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
  const start = new Date(startTime);
  const end = new Date(endTime);

  // TODO (Member B):
  // 1. Validate: end > start (endTime must be after startTime)
  // 2. Fetch asset; verify isBookable = true
  // 3. Check overlapping bookings:
  //    const conflicts = await prisma.booking.findMany({
  //      where: {
  //        assetId,
  //        status: { in: ['UPCOMING', 'ONGOING'] },
  //        startTime: { lt: end },   // existing starts before our end
  //        endTime:   { gt: start }, // existing ends after our start
  //      }
  //    });
  // 4. If conflicts.length > 0:
  //    const c = conflicts[0];
  //    const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  //    throw Object.assign(
  //      new Error(`Overlaps with existing booking ${fmt(c.startTime)}–${fmt(c.endTime)}`),
  //      { status: 409, conflict: c }
  //    );
  // 5. Create booking, set asset.status = RESERVED if needed
  // 6. Schedule reminder notification (booking - 15 min) — can use setTimeout for hackathon
  // 7. Log + broadcast
  // 8. Return new booking

  throw new Error('TODO: implement bookingService.createBooking()');
}

/**
 * Cancel a booking.
 */
async function cancelBooking(bookingId, actor) {
  // TODO (Member B): Set status = CANCELLED; notify user; log
  throw new Error('TODO: implement bookingService.cancelBooking()');
}

module.exports = { createBooking, cancelBooking };
