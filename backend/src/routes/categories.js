/**
 * routes/categories.js — Asset Category management (Admin only)
 *
 * GET    /api/categories       — List all categories
 * POST   /api/categories       — Create category
 * GET    /api/categories/:id   — Get single category
 * PUT    /api/categories/:id   — Update category + custom fields schema
 * DELETE /api/categories/:id   — Delete (only if no assets assigned)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');

// GET /api/categories
router.get('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member A): List categories with _count of assets
    res.json({ message: 'TODO: list categories' });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A):
    //  - Validate: name (required, unique), description (optional)
    //  - customFields: JSON object defining extra fields e.g. { "warrantyPeriod": "text" }
    res.status(201).json({ message: 'TODO: create category' });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member A): Include associated assets
    res.json({ message: 'TODO: get category', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A): Update name, description, customFields
    res.json({ message: 'TODO: update category', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A): Reject if assets exist under this category
    res.json({ message: 'TODO: delete category', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
