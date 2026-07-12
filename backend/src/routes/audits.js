/**
 * routes/audits.js — Audit Cycle management
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireDeptHead } = require('../middleware/roleGuard');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

// GET /api/audits
router.get('/', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        c.id, 
        c.name, 
        c.scope_type AS "scopeType", 
        c.scope_value AS "scopeValue", 
        c.start_date AS "startDate", 
        c.end_date AS "endDate", 
        c.status, 
        c.created_at AS "createdAt",
        (SELECT COUNT(*)::int FROM audit_result r WHERE r.cycle_id = c.id) AS results_count,
        (SELECT COUNT(*)::int FROM audit_assignment a WHERE a.cycle_id = c.id) AS assignments_count
      FROM audit_cycle c
      ORDER BY c.created_at DESC
      `
    );

    const cycles = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      scopeType: r.scopeType,
      scopeValue: r.scopeValue,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
      createdAt: r.createdAt,
      _count: {
        results: r.results_count,
        assignments: r.assignments_count
      }
    }));

    res.json(cycles);
  } catch (err) {
    next(err);
  }
});

// POST /api/audits
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, scopeType, scopeValue, startDate, endDate } = req.body;

    if (!name || !scopeType || !scopeValue || !startDate || !endDate) {
      return res.status(400).json({ error: 'All fields are required: name, scopeType, scopeValue, startDate, endDate' });
    }

    if (scopeType !== 'DEPARTMENT' && scopeType !== 'LOCATION') {
      return res.status(400).json({ error: 'scopeType must be either DEPARTMENT or LOCATION' });
    }

    // Verify department exists if scopeType is DEPARTMENT
    if (scopeType === 'DEPARTMENT') {
      const deptCheck = await pool.query('SELECT id FROM department WHERE id = $1', [scopeValue]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Department specified as scope value not found' });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO audit_cycle (name, scope_type, scope_value, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, 'OPEN')
      RETURNING id, name, scope_type AS "scopeType", scope_value AS "scopeValue", start_date AS "startDate", end_date AS "endDate", status, created_at AS "createdAt"
      `,
      [name.trim(), scopeType, scopeValue, new Date(startDate), new Date(endDate)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const cycleRes = await pool.query(
      `
      SELECT 
        id, 
        name, 
        scope_type AS "scopeType", 
        scope_value AS "scopeValue", 
        start_date AS "startDate", 
        end_date AS "endDate", 
        status, 
        created_at AS "createdAt"
      FROM audit_cycle
      WHERE id = $1
      `,
      [id]
    );

    if (cycleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }

    const cycle = cycleRes.rows[0];

    // Fetch assignments (auditors)
    const assignmentsRes = await pool.query(
      `
      SELECT 
        a.id, 
        a.auditor_id AS "auditorId", 
        e.name AS auditor_name, 
        e.email AS auditor_email
      FROM audit_assignment a
      JOIN employee e ON a.auditor_id = e.id
      WHERE a.cycle_id = $1
      `,
      [id]
    );
    cycle.assignments = assignmentsRes.rows;

    // Summary counts
    const resultsCountRes = await pool.query(
      `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN verdict = 'VERIFIED' THEN 1 END)::int AS verified,
        COUNT(CASE WHEN verdict = 'MISSING' THEN 1 END)::int AS missing,
        COUNT(CASE WHEN verdict = 'DAMAGED' THEN 1 END)::int AS damaged
      FROM audit_result
      WHERE cycle_id = $1
      `,
      [id]
    );
    cycle.summary = resultsCountRes.rows[0];

    res.json(cycle);
  } catch (err) {
    next(err);
  }
});

// POST /api/audits/:id/assign
router.post('/:id/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { auditorIds } = req.body; // array of IDs

    if (!auditorIds || !Array.isArray(auditorIds) || auditorIds.length === 0) {
      return res.status(400).json({ error: 'auditorIds array is required' });
    }

    // Check cycle exists
    const cycleRes = await pool.query('SELECT name FROM audit_cycle WHERE id = $1', [id]);
    if (cycleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }
    const cycleName = cycleRes.rows[0].name;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const createdAssignments = [];

      for (const auditorId of auditorIds) {
        // Verify employee exists
        const empCheck = await client.query('SELECT id, name FROM employee WHERE id = $1 AND status = true', [auditorId]);
        if (empCheck.rows.length === 0) {
          throw Object.assign(new Error(`Active employee with ID ${auditorId} not found`), { status: 400 });
        }

        // Check if already assigned
        const assignCheck = await client.query(
          'SELECT id FROM audit_assignment WHERE cycle_id = $1 AND auditor_id = $2',
          [id, auditorId]
        );

        if (assignCheck.rows.length === 0) {
          const insertRes = await client.query(
            `
            INSERT INTO audit_assignment (cycle_id, auditor_id)
            VALUES ($1, $2)
            RETURNING id, cycle_id AS "cycleId", auditor_id AS "auditorId", created_at AS "createdAt"
            `,
            [id, auditorId]
          );
          createdAssignments.push(insertRes.rows[0]);

          // Notify auditor
          const msg = `You have been assigned to audit cycle "${cycleName}".`;
          await notificationService.send(auditorId, 'AUDIT_ASSIGNED', msg, id, 'AUDIT');
        }
      }

      await client.query('COMMIT');
      res.status(201).json(createdAssignments);

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

// GET /api/audits/:id/assets — assets in scope for this cycle
router.get('/:id/assets', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch cycle scope
    const cycleRes = await pool.query('SELECT * FROM audit_cycle WHERE id = $1', [id]);
    if (cycleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }
    const cycle = cycleRes.rows[0];

    let assetsQuery = '';
    const params = [];

    if (cycle.scope_type === 'DEPARTMENT') {
      // Find assets allocated directly to this department or to employees belonging to this department
      assetsQuery = `
        SELECT DISTINCT
          ast.id, 
          ast.tag, 
          ast.name, 
          ast.category_id AS "categoryId", 
          ast.serial_number AS "serialNumber", 
          ast.condition, 
          ast.status, 
          ast.location,
          cat.name AS category_name
        FROM asset ast
        JOIN asset_category cat ON ast.category_id = cat.id
        JOIN allocation alloc ON alloc.asset_id = ast.id AND alloc.status = 'ACTIVE'
        LEFT JOIN employee emp ON alloc.employee_id = emp.id
        WHERE alloc.department_id = $1 OR emp.department_id = $1
      `;
      params.push(cycle.scope_value);
    } else if (cycle.scope_type === 'LOCATION') {
      assetsQuery = `
        SELECT 
          ast.id, 
          ast.tag, 
          ast.name, 
          ast.category_id AS "categoryId", 
          ast.serial_number AS "serialNumber", 
          ast.condition, 
          ast.status, 
          ast.location,
          cat.name AS category_name
        FROM asset ast
        JOIN asset_category cat ON ast.category_id = cat.id
        WHERE ast.location ILIKE $1
      `;
      params.push(cycle.scope_value);
    } else {
      return res.status(400).json({ error: 'Unsupported scope type' });
    }

    const assetsRes = await pool.query(assetsQuery, params);
    const assets = assetsRes.rows;

    // Fetch audit results for this cycle
    const resultsRes = await pool.query(
      `
      SELECT 
        r.id, 
        r.asset_id AS "assetId", 
        r.verdict, 
        r.notes, 
        r.auditor_id AS "auditorId",
        emp.name AS auditor_name
      FROM audit_result r
      JOIN employee emp ON r.auditor_id = emp.id
      WHERE r.cycle_id = $1
      `,
      [id]
    );
    const results = resultsRes.rows;

    // Attach results to assets
    const assetsWithResults = assets.map(a => {
      const match = results.find(r => r.assetId.toString() === a.id.toString());
      return {
        ...a,
        category: {
          id: a.categoryId,
          name: a.category_name
        },
        auditResult: match ? {
          id: match.id,
          verdict: match.verdict,
          notes: match.notes,
          auditor: {
            id: match.auditorId,
            name: match.auditor_name
          }
        } : null
      };
    });

    res.json(assetsWithResults);

  } catch (err) {
    next(err);
  }
});

// PUT /api/audits/:id/results — bulk submit verdicts
router.put('/:id/results', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { results } = req.body; // array of [{ assetId, verdict, notes }]
    const actor = req.user;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'results array is required' });
    }

    // 1. Verify req.user is assigned auditor for this cycle or Admin
    const assignCheck = await pool.query(
      'SELECT id FROM audit_assignment WHERE cycle_id = $1 AND auditor_id = $2',
      [id, actor.id]
    );
    
    if (assignCheck.rows.length === 0 && actor.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You are not an assigned auditor for this cycle.' });
    }

    // Verify cycle status !== CLOSED
    const cycleRes = await pool.query('SELECT status FROM audit_cycle WHERE id = $1', [id]);
    if (cycleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }
    const cycleStatus = cycleRes.rows[0].status;
    if (cycleStatus === 'CLOSED') {
      return res.status(400).json({ error: 'Audit cycle is closed. Cannot submit new results.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const savedResults = [];

      for (const item of results) {
        const { assetId, verdict, notes } = item;

        if (!assetId || !verdict) {
          throw Object.assign(new Error('Each result must specify assetId and verdict'), { status: 400 });
        }

        // Verify asset exists
        const assetCheck = await client.query('SELECT id FROM asset WHERE id = $1', [assetId]);
        if (assetCheck.rows.length === 0) {
          throw Object.assign(new Error(`Asset with ID ${assetId} not found`), { status: 400 });
        }

        // Check if result already exists for this asset in this cycle
        const existingRes = await client.query(
          'SELECT id FROM audit_result WHERE cycle_id = $1 AND asset_id = $2',
          [id, assetId]
        );

        let finalResultRow;
        if (existingRes.rows.length > 0) {
          // Update
          const updateRes = await client.query(
            `
            UPDATE audit_result
            SET verdict = $1, notes = $2, auditor_id = $3
            WHERE cycle_id = $4 AND asset_id = $5
            RETURNING id, cycle_id AS "cycleId", asset_id AS "assetId", auditor_id AS "auditorId", verdict, notes, created_at AS "createdAt"
            `,
            [verdict, notes || null, actor.id, id, assetId]
          );
          finalResultRow = updateRes.rows[0];
        } else {
          // Insert
          const insertRes = await client.query(
            `
            INSERT INTO audit_result (cycle_id, asset_id, auditor_id, verdict, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, cycle_id AS "cycleId", asset_id AS "assetId", auditor_id AS "auditorId", verdict, notes, created_at AS "createdAt"
            `,
            [id, assetId, actor.id, verdict, notes || null]
          );
          finalResultRow = insertRes.rows[0];
        }

        savedResults.push(finalResultRow);
      }

      // 2. Set cycle status = IN_PROGRESS if first submission (status is currently OPEN)
      if (cycleStatus === 'OPEN') {
        await client.query(
          "UPDATE audit_cycle SET status = 'IN_PROGRESS' WHERE id = $1",
          [id]
        );
      }

      await client.query('COMMIT');
      res.json(savedResults);

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

// GET /api/audits/:id/discrepancies
router.get('/:id/discrepancies', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        r.id, 
        r.cycle_id AS "cycleId", 
        r.asset_id AS "assetId", 
        r.auditor_id AS "auditorId", 
        r.verdict, 
        r.notes, 
        r.created_at AS "createdAt",
        ast.name AS asset_name,
        ast.tag AS asset_tag,
        e.name AS auditor_name
      FROM audit_result r
      JOIN asset ast ON r.asset_id = ast.id
      JOIN employee e ON r.auditor_id = e.id
      WHERE r.cycle_id = $1 AND r.verdict IN ('MISSING', 'DAMAGED')
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [id]);
    
    const discrepancies = result.rows.map(row => ({
      id: row.id,
      cycleId: row.cycleId,
      assetId: row.assetId,
      auditorId: row.auditorId,
      verdict: row.verdict,
      notes: row.notes,
      createdAt: row.createdAt,
      asset: {
        id: row.assetId,
        name: row.asset_name,
        tag: row.asset_tag
      },
      auditor: {
        id: row.auditorId,
        name: row.auditor_name
      }
    }));

    res.json(discrepancies);
  } catch (err) {
    next(err);
  }
});

// PUT /api/audits/:id/close
router.put('/:id/close', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await auditService.closeCycle(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
