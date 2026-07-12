/**
 * routes/assets.js — Asset Registry
 *
 * GET    /api/assets              — Search/filter assets
 * POST   /api/assets              — Register new asset (auto-tag: AF-XXXX)
 * GET    /api/assets/:id          — Asset detail
 * PUT    /api/assets/:id          — Update asset info
 * GET    /api/assets/:id/history  — Allocation + maintenance history timeline
 * POST   /api/assets/:id/photo    — Upload asset photo (Multer)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');

// Multer config for asset photos
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// GET /api/assets
router.get('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Filters: ?tag=, ?status=, ?categoryId=, ?departmentId=, ?location=, ?isBookable=
    //  - Search: ?search= (asset tag, name, serial number)
    //  - Include: category, current allocation (employee/dept name)
    //  - Pagination: ?page=&limit=
    res.json({ message: 'TODO: list assets' });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets
router.post('/', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Generate next tag: query max tag number, increment (AF-0001, AF-0002, ...)
    //  2. Validate: name, categoryId (must exist), serialNumber, acquisitionDate, condition
    //  3. Set status = AVAILABLE by default
    //  4. Log in ActivityLog
    res.status(201).json({ message: 'TODO: register asset' });
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Return asset with category, active allocation, recent maintenance
    res.json({ message: 'TODO: get asset', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/assets/:id
router.put('/:id', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    // TODO (Member B): Update asset details; status changes go through specific workflow routes
    res.json({ message: 'TODO: update asset', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id/history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Return merged chronological timeline:
    //    [ { type: 'ALLOCATION', date, actor, detail }, { type: 'MAINTENANCE', ... }, ... ]
    res.json({ message: 'TODO: asset history', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/:id/photo
router.post('/:id/photo', authenticate, requireAssetManager, upload.single('photo'), async (req, res, next) => {
  try {
    // TODO (Member B): Save req.file.path as asset.photoUrl
    res.json({ message: 'TODO: upload photo', file: req.file?.filename });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
