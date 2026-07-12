/**
 * routes/employees.js — Employee Directory management
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireDeptHead } = require('../middleware/roleGuard');
const notificationService = require('../services/notificationService');

// Helper to map DB row
function mapEmployeeRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status ? 'ACTIVE' : 'INACTIVE',
    departmentId: row.departmentId,
    createdAt: row.createdAt,
    department: row.departmentId ? { id: row.departmentId, name: row.department_name } : null
  };
}

// GET /api/employees
router.get('/', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const { role, status, departmentId, search } = req.query;
    const actor = req.user;

    let query = `
      SELECT 
        e.id, 
        e.name, 
        e.email, 
        e.role, 
        e.status, 
        e.department_id AS "departmentId", 
        e.created_at AS "createdAt",
        d.name AS department_name
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based scope filtering
    if (actor.role === 'DEPT_HEAD') {
      // Find the department(s) managed by this head or that they belong to
      const deptRes = await pool.query('SELECT id FROM department WHERE head_employee_id = $1', [actor.id]);
      if (deptRes.rows.length > 0) {
        const deptIds = deptRes.rows.map(r => r.id);
        query += ` AND e.department_id = ANY($${params.length + 1})`;
        params.push(deptIds);
      } else {
        // Fallback: only their own department
        if (actor.department_id) {
          query += ` AND e.department_id = $${params.length + 1}`;
          params.push(actor.department_id);
        } else {
          // If no department and not head, returns empty list or just themselves
          query += ` AND e.id = $${params.length + 1}`;
          params.push(actor.id);
        }
      }
    }

    // Apply URL query filters
    if (role) {
      query += ` AND e.role = $${params.length + 1}`;
      params.push(role);
    }

    if (status) {
      const activeVal = status === 'ACTIVE' || status === 'true';
      query += ` AND e.status = $${params.length + 1}`;
      params.push(activeVal);
    }

    if (departmentId) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(departmentId);
    }

    if (search) {
      query += ` AND (e.name ILIKE $${params.length + 1} OR e.email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY e.name ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapEmployeeRow));
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const actor = req.user;

    // Fetch employee profile
    const empRes = await pool.query(
      `
      SELECT 
        e.id, 
        e.name, 
        e.email, 
        e.role, 
        e.status, 
        e.department_id AS "departmentId", 
        e.created_at AS "createdAt",
        d.name AS department_name
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.id
      WHERE e.id = $1
      `,
      [id]
    );

    if (empRes.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeRow = empRes.rows[0];
    const employee = mapEmployeeRow(employeeRow);

    // Guard: employees can only view their own profile unless manager+
    if (actor.role === 'EMPLOYEE' && actor.id.toString() !== id.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
    }

    if (actor.role === 'DEPT_HEAD') {
      // Dept head can only view department members or themselves
      const deptRes = await pool.query('SELECT id FROM department WHERE head_employee_id = $1', [actor.id]);
      const deptIds = deptRes.rows.map(r => r.id);
      
      const belongsToDept = employee.departmentId && deptIds.map(d => d.toString()).includes(employee.departmentId.toString());
      if (!belongsToDept && actor.id.toString() !== id.toString()) {
        return res.status(403).json({ error: 'Access denied. Department Head can only view members of their own department.' });
      }
    }

    // Fetch current asset allocations
    const allocationsRes = await pool.query(
      `
      SELECT 
        a.id, 
        a.asset_id AS "assetId", 
        a.status, 
        a.expected_return AS "expectedReturn", 
        ast.name AS "assetName", 
        ast.tag AS "assetTag"
      FROM allocation a
      JOIN asset ast ON a.asset_id = ast.id
      WHERE a.employee_id = $1 AND a.status = 'ACTIVE'
      ORDER BY a.created_at DESC
      `,
      [id]
    );
    employee.allocations = allocationsRes.rows;

    // Fetch recent activity
    const activityRes = await pool.query(
      `
      SELECT 
        id, 
        action, 
        entity, 
        entity_id AS "entityId", 
        metadata, 
        created_at AS "createdAt"
      FROM activity_log 
      WHERE actor_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
      `,
      [id]
    );
    employee.activity = activityRes.rows;

    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id — Update basic info (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, departmentId, status } = req.body;

    const empCheck = await pool.query('SELECT * FROM employee WHERE id = $1', [id]);
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const currentEmp = empCheck.rows[0];

    // Validate department if changing
    if (departmentId && departmentId !== currentEmp.department_id) {
      const deptCheck = await pool.query('SELECT id FROM department WHERE id = $1 AND status = true', [departmentId]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Department not found or inactive' });
      }
    }

    const updatedName = name !== undefined ? name.trim() : currentEmp.name;
    const updatedDeptId = departmentId !== undefined ? (departmentId || null) : currentEmp.department_id;
    const updatedStatus = status !== undefined ? (status === 'ACTIVE' || status === true) : currentEmp.status;

    await pool.query(
      `
      UPDATE employee
      SET name = $1, department_id = $2, status = $3
      WHERE id = $4
      `,
      [updatedName, updatedDeptId, updatedStatus, id]
    );

    // Fetch updated details
    const result = await pool.query(
      `
      SELECT 
        e.id, 
        e.name, 
        e.email, 
        e.role, 
        e.status, 
        e.department_id AS "departmentId", 
        e.created_at AS "createdAt",
        d.name AS department_name
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.id
      WHERE e.id = $1
      `,
      [id]
    );

    res.json(mapEmployeeRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id/role — Role promotion (ADMIN ONLY)
router.put('/:id/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // 1. Validate new role is one of: EMPLOYEE, DEPT_HEAD, ASSET_MANAGER
    const validRoles = ['EMPLOYEE', 'DEPT_HEAD', 'ASSET_MANAGER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selection. Must be one of: EMPLOYEE, DEPT_HEAD, ASSET_MANAGER' });
    }

    const empCheck = await pool.query('SELECT * FROM employee WHERE id = $1', [id]);
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = empCheck.rows[0];

    // Protect Admin role from modification
    if (employee.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin role cannot be changed through this endpoint' });
    }

    // Update role
    await pool.query('UPDATE employee SET role = $1 WHERE id = $2', [role, id]);

    // 2. Log the action in ActivityLog
    await pool.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'PROMOTED_ROLE', 'EMPLOYEE', $2, $3)
      `,
      [
        req.user.id,
        id,
        JSON.stringify({ oldRole: employee.role, newRole: role })
      ]
    );

    // 3. Emit notification to the affected employee
    const msg = `Your role has been updated from ${employee.role} to ${role} by Admin.`;
    await notificationService.send(id, 'ASSET_ASSIGNED', msg, id, 'EMPLOYEE'); // Wait, use type that works, e.g. ASSET_ASSIGNED or just a generic notification type

    res.json({
      message: 'Employee role updated successfully',
      id,
      role
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
