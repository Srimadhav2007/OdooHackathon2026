/**
 * routes/employees.js — Employee Directory management
 *
 * GET  /api/employees          — List employees (Admin/Manager: all; DeptHead: dept only)
 * GET  /api/employees/:id      — Get employee profile
 * PUT  /api/employees/:id      — Update employee (name, dept, status)
 * PUT  /api/employees/:id/role — Promote/demote role (Admin only — THE ONLY place roles change)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireDeptHead } = require('../middleware/roleGuard');

// GET /api/employees
router.get('/', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member A):
    //  - Admin/AssetManager: return all employees
    //  - DeptHead: return only employees in their department
    //  - Support filters: ?role=, ?status=, ?departmentId=, ?search= (name/email)
    res.json({ message: 'TODO: list employees' });
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member A): Return profile + current allocation + recent activity
    // Guard: employees can only view their own profile unless manager+
    res.json({ message: 'TODO: get employee', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id — Update basic info
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A): Allow updating name, departmentId, status
    // Role cannot be changed here — use /role endpoint
    res.json({ message: 'TODO: update employee', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id/role — Role promotion (ADMIN ONLY)
router.put('/:id/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member A):
    //  - Validate new role is one of: EMPLOYEE, DEPT_HEAD, ASSET_MANAGER
    //  - Admin role CANNOT be assigned through this endpoint (protect admin)
    //  - Log the action in ActivityLog
    //  - Emit notification to the affected employee
    res.json({ message: 'TODO: update employee role', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
