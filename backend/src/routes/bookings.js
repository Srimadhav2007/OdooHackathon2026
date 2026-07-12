/**
 * routes/bookings.js — Resource Booking (time-slot with overlap validation)
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');
const bookingService = require('../services/bookingService');

// Helper to map booking row
function mapBookingRow(row) {
  return {
    id: row.id,
    assetId: row.assetId,
    userId: row.userId,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    asset: {
      id: row.assetId,
      name: row.asset_name,
      tag: row.asset_tag
    },
    user: {
      id: row.userId,
      name: row.employee_name
    }
  };
}

// GET /api/bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { assetId, userId, status, from, to } = req.query;

    let query = `
      SELECT 
        b.id, 
        b.asset_id AS "assetId", 
        b.user_id AS "userId", 
        b.start_time AS "startTime", 
        b.end_time AS "endTime", 
        b.status, 
        b.notes, 
        b.created_at AS "createdAt",
        ast.name AS asset_name,
        ast.tag AS asset_tag,
        emp.name AS employee_name
      FROM booking b
      JOIN asset ast ON b.asset_id = ast.id
      JOIN employee emp ON b.user_id = emp.id
      WHERE 1=1
    `;
    const params = [];

    if (assetId) {
      query += ` AND b.asset_id = $${params.length + 1}`;
      params.push(assetId);
    }

    if (userId) {
      query += ` AND b.user_id = $${params.length + 1}`;
      params.push(userId);
    }

    if (status) {
      query += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    if (from) {
      query += ` AND b.start_time >= $${params.length + 1}`;
      params.push(new Date(from));
    }

    if (to) {
      query += ` AND b.end_time <= $${params.length + 1}`;
      params.push(new Date(to));
    }

    query += ` ORDER BY b.start_time ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapBookingRow));

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
    const { id } = req.params;

    const query = `
      SELECT 
        b.id, 
        b.asset_id AS "assetId", 
        b.user_id AS "userId", 
        b.start_time AS "startTime", 
        b.end_time AS "endTime", 
        b.status, 
        b.notes, 
        b.created_at AS "createdAt",
        ast.name AS asset_name,
        ast.tag AS asset_tag,
        emp.name AS employee_name
      FROM booking b
      JOIN asset ast ON b.asset_id = ast.id
      JOIN employee emp ON b.user_id = emp.id
      WHERE b.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(mapBookingRow(result.rows[0]));

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
    const { id } = req.params;
    const { startTime, endTime } = req.body;
    const actor = req.user;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Fetch booking
      const bookingRes = await client.query('SELECT * FROM booking WHERE id = $1', [id]);
      if (bookingRes.rows.length === 0) {
        throw Object.assign(new Error('Booking not found'), { status: 404 });
      }
      const booking = bookingRes.rows[0];

      // Verify requester is booking owner or manager
      const isOwner = booking.user_id.toString() === actor.id.toString();
      const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
      if (!isOwner && !isManager) {
        throw Object.assign(new Error('Access denied. You are not authorized to reschedule this booking.'), { status: 403 });
      }

      if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
        throw Object.assign(new Error(`Cannot reschedule booking in status: ${booking.status}`), { status: 400 });
      }

      // Re-validate overlap excluding this booking's own ID
      const conflictsRes = await client.query(
        `
        SELECT * FROM booking
        WHERE asset_id = $1 
          AND id != $2
          AND status IN ('UPCOMING', 'ONGOING')
          AND start_time < $3 
          AND end_time > $4
        LIMIT 1
        `,
        [booking.asset_id, id, end, start]
      );

      if (conflictsRes.rows.length > 0) {
        const c = conflictsRes.rows[0];
        const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        throw Object.assign(
          new Error(`Overlaps with existing booking ${fmt(c.start_time)}–${fmt(c.end_time)}`),
          { status: 409, conflict: c }
        );
      }

      // Update booking
      const updateRes = await client.query(
        `
        UPDATE booking 
        SET start_time = $1, end_time = $2, status = 'UPCOMING'
        WHERE id = $3
        RETURNING *
        `,
        [start, end, id]
      );
      const updatedBooking = updateRes.rows[0];

      // Log activity
      await client.query(
        `
        INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
        VALUES ($1, 'RESCHEDULED_BOOKING', 'BOOKING', $2, $3)
        `,
        [
          actor.id,
          id,
          JSON.stringify({ assetId: booking.asset_id, oldStart: booking.start_time, oldEnd: booking.end_time, newStart: start, newEnd: end })
        ]
      );

      await client.query('COMMIT');
      res.json(updatedBooking);

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    next(err);
  }
});

module.exports = router;
