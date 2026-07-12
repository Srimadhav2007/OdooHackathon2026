/**
 * routes/departments.js — Department management (Admin only)
 *
 * GET    /api/departments          — List all departments (with hierarchy)
 * POST   /api/departments          — Create department
 * GET    /api/departments/:id      — Get single department
 * PUT    /api/departments/:id      — Update (name, head, parent, status)
 * DELETE /api/departments/:id      — Deactivate (soft delete)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');

// GET /api/departments
router.get('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member A):
    //  - Include parent, children, head (name, email), _count of employees
    //  - Support ?status=ACTIVE filter
    res.json({ message: 'TODO: list departments' });
  } catch (err) {
    next(err);
  }
});

// POST /api/departments
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A):
    //  - Validate: name (required, unique), parentId (optional, must exist), headId (optional)
    //  - Create and return full department object
    res.status(201).json({ message: 'TODO: create department' });
  } catch (err) {
    next(err);
  }
});

// GET /api/departments/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member A): Return department with employees list and asset allocations
    res.json({ message: 'TODO: get department', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/departments/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A): Update allowed fields; verify headId is an employee in this dept
    res.json({ message: 'TODO: update department', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/departments/:id (soft deactivate)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A): Set status = INACTIVE; check no active employees/assets
    res.json({ message: 'TODO: deactivate department', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
