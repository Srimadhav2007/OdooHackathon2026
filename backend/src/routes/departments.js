/**
 * routes/departments.js — Department management (Admin only)
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');

// Helper to map DB row to Prisma-like response
function mapDepartmentRow(row) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    headId: row.headId,
    status: row.status ? 'ACTIVE' : 'INACTIVE',
    createdAt: row.createdAt,
    parent: row.parentId ? { id: row.parentId, name: row.parent_name } : null,
    head: row.headId ? { id: row.headId, name: row.head_name, email: row.head_email } : null,
    _count: {
      employees: parseInt(row.employees_count || 0, 10)
    }
  };
}

// GET /api/departments
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        d.id, 
        d.name, 
        d.parent_department_id AS "parentId", 
        d.head_employee_id AS "headId", 
        d.status, 
        d.created_at AS "createdAt",
        p.name AS parent_name,
        e.name AS head_name,
        e.email AS head_email,
        (SELECT COUNT(*)::int FROM employee emp WHERE emp.department_id = d.id AND emp.status = true) AS employees_count
      FROM department d
      LEFT JOIN department p ON d.parent_department_id = p.id
      LEFT JOIN employee e ON d.head_employee_id = e.id
    `;
    
    const params = [];
    if (status === 'ACTIVE') {
      query += ` WHERE d.status = true`;
    } else if (status === 'INACTIVE') {
      query += ` WHERE d.status = false`;
    }

    query += ` ORDER BY d.name ASC`;

    const result = await pool.query(query, params);
    
    // Map hierarchy: inject children arrays
    const departments = result.rows.map(mapDepartmentRow);
    
    // For children list, fetch them or build locally
    for (const dept of departments) {
      dept.children = departments.filter(d => d.parentId?.toString() === dept.id.toString());
    }

    res.json(departments);
  } catch (err) {
    next(err);
  }
});

// POST /api/departments
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, parentId, headId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    // Check unique name
    const existing = await pool.query('SELECT id FROM department WHERE name = $1', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Department name already exists' });
    }

    // Verify parent if provided
    if (parentId) {
      const parentCheck = await pool.query('SELECT id FROM department WHERE id = $1 AND status = true', [parentId]);
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Parent department not found or inactive' });
      }
    }

    // Verify head employee if provided
    if (headId) {
      const headCheck = await pool.query('SELECT id FROM employee WHERE id = $1 AND status = true', [headId]);
      if (headCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Head employee not found or inactive' });
      }
    }

    const pId = parentId || null;
    const hId = headId || null;

    const result = await pool.query(
      `
      INSERT INTO department (name, parent_department_id, head_employee_id, status)
      VALUES ($1, $2, $3, true)
      RETURNING id, name, parent_department_id AS "parentId", head_employee_id AS "headId", status, created_at AS "createdAt"
      `,
      [name.trim(), pId, hId]
    );

    const newDeptRow = result.rows[0];

    // Fetch joined details for the response
    const detailRes = await pool.query(
      `
      SELECT 
        d.id, 
        d.name, 
        d.parent_department_id AS "parentId", 
        d.head_employee_id AS "headId", 
        d.status, 
        d.created_at AS "createdAt",
        p.name AS parent_name,
        e.name AS head_name,
        e.email AS head_email,
        0 AS employees_count
      FROM department d
      LEFT JOIN department p ON d.parent_department_id = p.id
      LEFT JOIN employee e ON d.head_employee_id = e.id
      WHERE d.id = $1
      `,
      [newDeptRow.id]
    );

    res.status(201).json(mapDepartmentRow(detailRes.rows[0]));
  } catch (err) {
    next(err);
  }
});

// GET /api/departments/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const deptRes = await pool.query(
      `
      SELECT 
        d.id, 
        d.name, 
        d.parent_department_id AS "parentId", 
        d.head_employee_id AS "headId", 
        d.status, 
        d.created_at AS "createdAt",
        p.name AS parent_name,
        e.name AS head_name,
        e.email AS head_email,
        (SELECT COUNT(*)::int FROM employee emp WHERE emp.department_id = d.id AND emp.status = true) AS employees_count
      FROM department d
      LEFT JOIN department p ON d.parent_department_id = p.id
      LEFT JOIN employee e ON d.head_employee_id = e.id
      WHERE d.id = $1
      `,
      [id]
    );

    if (deptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const dept = mapDepartmentRow(deptRes.rows[0]);

    // Fetch employees in department
    const employeesRes = await pool.query(
      `SELECT id, name, email, role, status FROM employee WHERE department_id = $1 ORDER BY name ASC`,
      [id]
    );
    dept.employees = employeesRes.rows.map(r => ({
      ...r,
      status: r.status ? 'ACTIVE' : 'INACTIVE'
    }));

    // Fetch asset allocations for department
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
      WHERE a.department_id = $1 AND a.status = 'ACTIVE'
      ORDER BY a.created_at DESC
      `,
      [id]
    );
    dept.allocations = allocationsRes.rows;

    res.json(dept);
  } catch (err) {
    next(err);
  }
});

// PUT /api/departments/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, parentId, headId, status } = req.body;

    // Check if dept exists
    const deptCheck = await pool.query('SELECT * FROM department WHERE id = $1', [id]);
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const currentDept = deptCheck.rows[0];

    // Validate name uniqueness if changing
    if (name && name.trim() !== currentDept.name) {
      const existing = await pool.query('SELECT id FROM department WHERE name = $1', [name.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Department name already exists' });
      }
    }

    // Validate parentId if changing
    if (parentId && parentId !== currentDept.parent_department_id) {
      if (parentId.toString() === id.toString()) {
        return res.status(400).json({ error: 'A department cannot be its own parent' });
      }
      const parentCheck = await pool.query('SELECT id FROM department WHERE id = $1 AND status = true', [parentId]);
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Parent department not found or inactive' });
      }
    }

    // Validate headId if changing (must be employee of this dept)
    if (headId && headId !== currentDept.head_employee_id) {
      const employeeCheck = await pool.query(
        'SELECT id, department_id FROM employee WHERE id = $1 AND status = true',
        [headId]
      );
      if (employeeCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Head employee not found or inactive' });
      }
      // Note: "verify headId is an employee in this dept"
      if (employeeCheck.rows[0].department_id?.toString() !== id.toString()) {
        return res.status(400).json({ error: 'Head employee must belong to this department' });
      }
    }

    // Set variables
    const updatedName = name !== undefined ? name.trim() : currentDept.name;
    const updatedParentId = parentId !== undefined ? (parentId || null) : currentDept.parent_department_id;
    const updatedHeadId = headId !== undefined ? (headId || null) : currentDept.head_employee_id;
    const updatedStatus = status !== undefined ? (status === 'ACTIVE' || status === true) : currentDept.status;

    await pool.query(
      `
      UPDATE department
      SET name = $1, parent_department_id = $2, head_employee_id = $3, status = $4
      WHERE id = $5
      `,
      [updatedName, updatedParentId, updatedHeadId, updatedStatus, id]
    );

    // Fetch updated details
    const detailRes = await pool.query(
      `
      SELECT 
        d.id, 
        d.name, 
        d.parent_department_id AS "parentId", 
        d.head_employee_id AS "headId", 
        d.status, 
        d.created_at AS "createdAt",
        p.name AS parent_name,
        e.name AS head_name,
        e.email AS head_email,
        (SELECT COUNT(*)::int FROM employee emp WHERE emp.department_id = d.id AND emp.status = true) AS employees_count
      FROM department d
      LEFT JOIN department p ON d.parent_department_id = p.id
      LEFT JOIN employee e ON d.head_employee_id = e.id
      WHERE d.id = $1
      `,
      [id]
    );

    res.json(mapDepartmentRow(detailRes.rows[0]));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/departments/:id (soft deactivate)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if dept exists
    const deptCheck = await pool.query('SELECT * FROM department WHERE id = $1', [id]);
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check no active employees
    const activeEmployees = await pool.query(
      'SELECT COUNT(*)::int AS count FROM employee WHERE department_id = $1 AND status = true',
      [id]
    );
    if (activeEmployees.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot deactivate department with active employees' });
    }

    // Check no active asset allocations
    const activeAllocations = await pool.query(
      "SELECT COUNT(*)::int AS count FROM allocation WHERE department_id = $1 AND status = 'ACTIVE'",
      [id]
    );
    if (activeAllocations.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot deactivate department with active asset allocations' });
    }

    await pool.query('UPDATE department SET status = false WHERE id = $1', [id]);

    res.json({ message: 'Department deactivated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
