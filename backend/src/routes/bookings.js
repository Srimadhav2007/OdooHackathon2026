/**
 * routes/bookings.js — Resource Booking (time-slot with overlap validation)
 *
 * GET    /api/bookings              — List bookings (filter by assetId for calendar)
 * POST   /api/bookings              — Create booking (overlap-rejected)
 * GET    /api/bookings/:id          — Booking detail
 * PUT    /api/bookings/:id/cancel   — Cancel booking
 * PUT    /api/bookings/:id/reschedule — Reschedule (re-validates overlap)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');
const bookingService = require('../services/bookingService');

// GET /api/bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - ?assetId=  → calendar view for that resource
    //  - ?userId=   → my bookings
    //  - ?status=   → filter by BookingStatus
    //  - ?from=&to= → date range
    res.json({ message: 'TODO: list bookings' });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings
router.post('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Delegate to bookingService.createBooking()
    //  - Returns 409 if overlap detected with specific conflict message
    //  - boundary touching (end == start of another) is ALLOWED
    //  - On success: create Notification reminder, log ActivityLog
    const result = await bookingService.createBooking(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    res.json({ message: 'TODO: get booking', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Verify requester is booking owner or manager
    //  - Set status = CANCELLED
    //  - Notify affected user
    res.json({ message: 'TODO: cancel booking', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/reschedule
router.put('/:id/reschedule', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Re-validate overlap with new times (excluding this booking's own slot)
    //  - Update startTime + endTime on success
    res.json({ message: 'TODO: reschedule booking', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
