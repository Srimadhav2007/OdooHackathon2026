/**
 * services/bookingService.js
 * Overlap validation for resource bookings.
 */

const pool = require('../config/db');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

/**
 * Create a booking after validating for overlaps.
 *
 * @param {object} data - { assetId, startTime, endTime, notes? }
 * @param {object} actor - req.user
 */
async function createBooking(data, actor) {
  const { assetId, startTime, endTime, notes } = data;
  
  if (!assetId || !startTime || !endTime) {
    throw Object.assign(new Error('Asset ID, startTime and endTime are required'), { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  // 1. Validate: end > start
  if (end <= start) {
    throw Object.assign(new Error('End time must be after start time'), { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Fetch asset; verify is_bookable = true
    const assetRes = await client.query('SELECT * FROM asset WHERE id = $1', [assetId]);
    if (assetRes.rows.length === 0) {
      throw Object.assign(new Error('Asset not found'), { status: 404 });
    }
    const asset = assetRes.rows[0];

    if (!asset.is_bookable) {
      throw Object.assign(new Error('This asset is not bookable/reservable'), { status: 400 });
    }

    // 3. Check overlapping bookings (status is UPCOMING or ONGOING)
    // Overlap condition: start_time < end AND end_time > start
    const conflictsRes = await client.query(
      `
      SELECT * FROM booking 
      WHERE asset_id = $1 
        AND status IN ('UPCOMING', 'ONGOING')
        AND start_time < $2 
        AND end_time > $3
      ORDER BY start_time ASC
      LIMIT 1
      `,
      [assetId, end, start]
    );

    // 4. If conflicts: throw conflict error
    if (conflictsRes.rows.length > 0) {
      const c = conflictsRes.rows[0];
      const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      throw Object.assign(
        new Error(`Overlaps with existing booking ${fmt(c.start_time)}–${fmt(c.end_time)}`),
        { status: 409, conflict: c }
      );
    }

    // 5. Create booking
    const insertBookingRes = await client.query(
      `
      INSERT INTO booking (asset_id, user_id, start_time, end_time, status, notes)
      VALUES ($1, $2, $3, $4, 'UPCOMING', $5)
      RETURNING *
      `,
      [assetId, actor.id, start, end, notes || null]
    );
    const booking = insertBookingRes.rows[0];

    // Optionally set asset.status = RESERVED
    // Note: Standard workflow sets status when booking begins, but we can set it to RESERVED or leave AVAILABLE.
    // Let's set it to RESERVED if the start time is close or immediately. 
    // We'll update the asset status to RESERVED.
    await client.query("UPDATE asset SET status = 'RESERVED' WHERE id = $1 AND status = 'AVAILABLE'", [assetId]);

    // 6. Schedule reminder notification (booking - 15 min) — for hackathon, let's create a database notification
    const msg = `Reminder: Your booking for "${asset.name}" starts at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    await client.query(
      `
      INSERT INTO notification (recipient_id, type, message, ref_id, ref_type)
      VALUES ($1, 'BOOKING_CONFIRMED', $2, $3, 'BOOKING')
      `,
      [actor.id, `Booking confirmed for "${asset.name}".`, booking.id]
    );

    // 7. Log ActivityLog
    await client.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'CREATED_BOOKING', 'BOOKING', $2, $3)
      `,
      [
        actor.id,
        booking.id,
        JSON.stringify({ assetId, startTime, endTime })
      ]
    );

    await client.query('COMMIT');

    broadcastDashboardRefresh();

    return booking;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cancel a booking.
 */
async function cancelBooking(bookingId, actor) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch booking
    const bookingRes = await client.query('SELECT * FROM booking WHERE id = $1', [bookingId]);
    if (bookingRes.rows.length === 0) {
      throw Object.assign(new Error('Booking not found'), { status: 404 });
    }
    const booking = bookingRes.rows[0];

    if (booking.status === 'CANCELLED') {
      throw Object.assign(new Error('Booking is already cancelled'), { status: 400 });
    }

    // Guard: employees can only cancel their own booking
    if (actor.role === 'EMPLOYEE' && booking.user_id.toString() !== actor.id.toString()) {
      throw Object.assign(new Error('Access denied. You can only cancel your own bookings.'), { status: 403 });
    }

    // 2. Set status = CANCELLED
    const updateRes = await client.query(
      `
      UPDATE booking 
      SET status = 'CANCELLED' 
      WHERE id = $1
      RETURNING *
      `,
      [bookingId]
    );
    const updatedBooking = updateRes.rows[0];

    // Revert asset status to AVAILABLE if it was RESERVED and no other active/upcoming bookings exist
    const otherBookingsRes = await client.query(
      `
      SELECT COUNT(*)::int AS count FROM booking 
      WHERE asset_id = $1 AND status IN ('UPCOMING', 'ONGOING')
      `,
      [booking.asset_id]
    );
    if (otherBookingsRes.rows[0].count === 0) {
      await client.query(
        `
        UPDATE asset 
        SET status = 'AVAILABLE' 
        WHERE id = $1 AND status = 'RESERVED'
        `,
        [booking.asset_id]
      );
    }

    // 3. Notify owner
    const msg = `Your booking for asset ID ${booking.asset_id} has been cancelled.`;
    await notificationService.send(booking.user_id, 'BOOKING_CANCELLED', msg, bookingId, 'BOOKING');

    // 4. Log
    await client.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'CANCELLED_BOOKING', 'BOOKING', $2, $3)
      `,
      [
        actor.id,
        bookingId,
        JSON.stringify({ assetId: booking.asset_id })
      ]
    );

    await client.query('COMMIT');

    broadcastDashboardRefresh();

    return updatedBooking;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createBooking, cancelBooking };
