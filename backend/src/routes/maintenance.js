/**
 * routes/maintenance.js — Maintenance Request workflow
 *
 * State machine: PENDING → APPROVED/REJECTED → TECHNICIAN_ASSIGNED → IN_PROGRESS → RESOLVED
 *
 * GET  /api/maintenance              — List requests (role-filtered)
 * POST /api/maintenance              — Raise request
 * GET  /api/maintenance/:id         — Request detail
 * PUT  /api/maintenance/:id/approve — Approve + assign technician (Asset Manager)
 * PUT  /api/maintenance/:id/reject  — Reject request (Asset Manager)
 * PUT  /api/maintenance/:id/start   — Mark In Progress (technician)
 * PUT  /api/maintenance/:id/resolve — Resolve + revert asset status (Asset Manager)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');
const maintenanceService = require('../services/maintenanceService');

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (_req, file, cb) => cb(null, `maint-${Date.now()}-${file.originalname}`),
  }),
});

// GET /api/maintenance
router.get('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Admin/AssetManager: all requests
    //  - Employee: only their own
    //  - Filters: ?status=, ?priority=, ?assetId=
    res.json({ message: 'TODO: list maintenance requests' });
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance
router.post('/', authenticate, upload.single('photo'), async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Validate: assetId (must exist + be ALLOCATED/AVAILABLE), description, priority
    //  - Create request with status = PENDING
    //  - Notify Asset Manager
    //  - Log ActivityLog
    res.status(201).json({ message: 'TODO: raise maintenance request' });
  } catch (err) {
    next(err);
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    res.json({ message: 'TODO: get maintenance request', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/approve
router.put('/:id/approve', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Set status = TECHNICIAN_ASSIGNED (or APPROVED if no tech assigned yet)
    //  2. Set asset.status = UNDER_MAINTENANCE
    //  3. Optionally assign technicianId from req.body
    //  4. Notify requester
    res.json({ message: 'TODO: approve maintenance', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/reject
router.put('/:id/reject', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Set status = REJECTED
    //  2. Asset status unchanged (stays in original state)
    //  3. Notify requester with rejection reason
    res.json({ message: 'TODO: reject maintenance', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/start
router.put('/:id/start', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Verify req.user is the assigned technician; set status = IN_PROGRESS
    res.json({ message: 'TODO: start maintenance', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/resolve
router.put('/:id/resolve', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Set status = RESOLVED, resolvedAt = now
    //  2. Set asset.status = AVAILABLE
    //  3. Save resolution notes from req.body
    //  4. Notify original requester
    res.json({ message: 'TODO: resolve maintenance', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
