/**
 * routes/reports.js — Analytics & Reports
 *
 * GET /api/reports/dashboard       — KPI counts for dashboard
 * GET /api/reports/utilization     — Asset utilization trend
 * GET /api/reports/maintenance     — Maintenance frequency by category
 * GET /api/reports/allocations     — Department-wise allocation summary
 * GET /api/reports/booking-heatmap — Peak booking hours by day
 * GET /api/reports/overdue         — All overdue return allocations
 * GET /api/reports/export/:type    — CSV export
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireDeptHead } = require('../middleware/roleGuard');

// GET /api/reports/dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Return KPI counts scoped to req.user.role
    // { assetsAvailable, assetsAllocated, maintenanceToday, activeBookings,
    //   pendingTransfers, upcomingReturns, overdueReturns }
    res.json({ message: 'TODO: dashboard KPIs' });
  } catch (err) { next(err); }
});

// GET /api/reports/utilization
router.get('/utilization', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): ?from=&to= → [{ date, allocatedCount }]
    res.json({ message: 'TODO: utilization report' });
  } catch (err) { next(err); }
});

// GET /api/reports/maintenance
router.get('/maintenance', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): Group by category; return frequency + avg resolution time
    res.json({ message: 'TODO: maintenance report' });
  } catch (err) { next(err); }
});

// GET /api/reports/allocations
router.get('/allocations', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): Per dept: total assets, employees, assets-per-employee
    res.json({ message: 'TODO: allocation summary' });
  } catch (err) { next(err); }
});

// GET /api/reports/booking-heatmap
router.get('/booking-heatmap', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): Booking count per hour per weekday
    res.json({ message: 'TODO: booking heatmap' });
  } catch (err) { next(err); }
});

// GET /api/reports/overdue
router.get('/overdue', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Allocations where expectedReturn < now AND status = ACTIVE
    res.json({ message: 'TODO: overdue returns' });
  } catch (err) { next(err); }
});

// GET /api/reports/export/:type
router.get('/export/:type', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): Generate CSV; set Content-Type + Content-Disposition headers
    res.json({ message: `TODO: export ${req.params.type} as CSV` });
  } catch (err) { next(err); }
});

module.exports = router;
