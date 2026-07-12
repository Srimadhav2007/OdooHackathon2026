/**
 * routes/maintenance.js — Maintenance Request workflow
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');
const maintenanceService = require('../services/maintenanceService');
const notificationService = require('../services/notificationService');

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (_req, file, cb) => cb(null, `maint-${Date.now()}-${file.originalname}`),
  }),
});

// Helper to map DB row
function mapMaintenanceRow(row) {
  return {
    id: row.id,
    assetId: row.assetId,
    raisedById: row.raisedById,
    priority: row.priority,
    status: row.status,
    description: row.description,
    photoUrl: row.photoUrl,
    approvedById: row.approvedById,
    technicianId: row.technicianId,
    resolvedAt: row.resolvedAt,
    resolution: row.resolution,
    createdAt: row.createdAt,
    asset: {
      id: row.assetId,
      name: row.asset_name,
      tag: row.asset_tag
    },
    raisedBy: {
      id: row.raisedById,
      name: row.requester_name
    },
    technician: row.technicianId ? {
      id: row.technicianId,
      name: row.technician_name
    } : null
  };
}

// GET /api/maintenance
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, assetId } = req.query;
    const actor = req.user;

    let query = `
      SELECT 
        m.id, 
        m.asset_id AS "assetId", 
        m.raised_by_id AS "raisedById", 
        m.priority, 
        m.status, 
        m.description, 
        m.photo_url AS "photoUrl", 
        m.approved_by_id AS "approvedById", 
        m.technician_id AS "technicianId", 
        m.resolved_at AS "resolvedAt", 
        m.resolution, 
        m.created_at AS "createdAt",
        ast.name AS asset_name,
        ast.tag AS asset_tag,
        req.name AS requester_name,
        tech.name AS technician_name
      FROM maintenance_request m
      JOIN asset ast ON m.asset_id = ast.id
      JOIN employee req ON m.raised_by_id = req.id
      LEFT JOIN employee tech ON m.technician_id = tech.id
      WHERE 1=1
    `;
    const params = [];

    // Role filtering
    if (actor.role === 'EMPLOYEE') {
      // Employees only see their own requests (or assigned requests as technician)
      query += ` AND (m.raised_by_id = $${params.length + 1} OR m.technician_id = $${params.length + 1})`;
      params.push(actor.id);
    } else if (actor.role === 'DEPT_HEAD') {
      // DeptHead sees own department's requests
      const deptsRes = await pool.query('SELECT id FROM department WHERE head_employee_id = $1', [actor.id]);
      if (deptsRes.rows.length > 0) {
        const deptIds = deptsRes.rows.map(r => r.id);
        query += ` AND (req.department_id = ANY($${params.length + 1}) OR m.raised_by_id = $${params.length + 2} OR m.technician_id = $${params.length + 2})`;
        params.push(deptIds, actor.id);
      } else {
        query += ` AND (m.raised_by_id = $${params.length + 1} OR m.technician_id = $${params.length + 1})`;
        params.push(actor.id);
      }
    }

    // Apply URL parameters filters
    if (status) {
      query += ` AND m.status = $${params.length + 1}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND m.priority = $${params.length + 1}`;
      params.push(priority);
    }

    if (assetId) {
      query += ` AND m.asset_id = $${params.length + 1}`;
      params.push(assetId);
    }

    query += ` ORDER BY m.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapMaintenanceRow));

  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance
router.post('/', authenticate, upload.single('photo'), async (req, res, next) => {
  try {
    const { assetId, description, priority } = req.body;
    const actor = req.user;

    if (!assetId || !description) {
      return res.status(400).json({ error: 'Asset ID and Description are required' });
    }

    // 1. Validate: assetId (must exist + be ALLOCATED/AVAILABLE)
    const assetCheck = await pool.query('SELECT id, status FROM asset WHERE id = $1', [assetId]);
    if (assetCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Asset not found' });
    }

    const asset = assetCheck.rows[0];
    const allowedStatuses = ['ALLOCATED', 'AVAILABLE'];
    if (!allowedStatuses.includes(asset.status)) {
      return res.status(400).json({ error: `Asset is currently in status: ${asset.status}. Must be AVAILABLE or ALLOCATED.` });
    }

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const prio = priority || 'MEDIUM';

    // 2. Create request with status = PENDING
    const result = await pool.query(
      `
      INSERT INTO maintenance_request (asset_id, raised_by_id, priority, status, description, photo_url)
      VALUES ($1, $2, $3, 'PENDING', $4, $5)
      RETURNING *
      `,
      [assetId, actor.id, prio, description.trim(), photoPath]
    );
    const request = result.rows[0];

    // 3. Notify Asset Managers
    const managersRes = await pool.query("SELECT id FROM employee WHERE role IN ('ASSET_MANAGER', 'ADMIN') AND status = true");
    const managerIds = managersRes.rows.map(r => r.id);
    const msg = `New maintenance request raised for asset ID ${assetId} (Priority: ${prio}).`;
    await notificationService.sendToMany(managerIds, 'MAINTENANCE_RAISED', msg, request.id, 'MAINTENANCE');

    // 4. Log ActivityLog
    await pool.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'RAISED_MAINTENANCE', 'MAINTENANCE_REQUEST', $2, $3)
      `,
      [actor.id, request.id, JSON.stringify({ assetId, priority: prio })]
    );

    res.status(201).json(request);

  } catch (err) {
    next(err);
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        m.id, 
        m.asset_id AS "assetId", 
        m.raised_by_id AS "raisedById", 
        m.priority, 
        m.status, 
        m.description, 
        m.photo_url AS "photoUrl", 
        m.approved_by_id AS "approvedById", 
        m.technician_id AS "technicianId", 
        m.resolved_at AS "resolvedAt", 
        m.resolution, 
        m.created_at AS "createdAt",
        ast.name AS asset_name,
        ast.tag AS asset_tag,
        req.name AS requester_name,
        tech.name AS technician_name
      FROM maintenance_request m
      JOIN asset ast ON m.asset_id = ast.id
      JOIN employee req ON m.raised_by_id = req.id
      LEFT JOIN employee tech ON m.technician_id = tech.id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    res.json(mapMaintenanceRow(result.rows[0]));

  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/approve
router.put('/:id/approve', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const { technicianId } = req.body;
    const result = await maintenanceService.approve(req.params.id, technicianId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/reject
router.put('/:id/reject', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Fetch request
      const reqRes = await client.query('SELECT * FROM maintenance_request WHERE id = $1', [id]);
      if (reqRes.rows.length === 0) {
        throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
      }
      const request = reqRes.rows[0];

      if (request.status !== 'PENDING') {
        throw Object.assign(new Error(`Request cannot be rejected from status: ${request.status}`), { status: 400 });
      }

      // Update status = REJECTED
      const updateRes = await client.query(
        `
        UPDATE maintenance_request
        SET status = 'REJECTED'
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );
      const updatedRequest = updateRes.rows[0];

      // Notify requester
      const msg = `Your maintenance request for asset ID ${request.asset_id} has been rejected. Reason: ${reason || 'None'}`;
      await notificationService.send(request.raised_by_id, 'MAINTENANCE_REJECTED', msg, id, 'MAINTENANCE');

      await client.query('COMMIT');
      res.json(updatedRequest);

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

// PUT /api/maintenance/:id/start
router.put('/:id/start', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const actor = req.user;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Fetch request
      const reqRes = await client.query('SELECT * FROM maintenance_request WHERE id = $1', [id]);
      if (reqRes.rows.length === 0) {
        throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
      }
      const request = reqRes.rows[0];

      // Verify req.user is assigned tech or manager/admin
      const isTech = request.technician_id && request.technician_id.toString() === actor.id.toString();
      const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
      if (!isTech && !isManager) {
        throw Object.assign(new Error('Access denied. You are not the assigned technician.'), { status: 403 });
      }

      const validStates = ['TECHNICIAN_ASSIGNED', 'APPROVED'];
      if (!validStates.includes(request.status)) {
        throw Object.assign(new Error(`Cannot start request in status: ${request.status}`), { status: 400 });
      }

      // Set status = IN_PROGRESS
      const updateRes = await client.query(
        `
        UPDATE maintenance_request
        SET status = 'IN_PROGRESS'
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      await client.query('COMMIT');
      res.json(updateRes.rows[0]);

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

// PUT /api/maintenance/:id/resolve
router.put('/:id/resolve', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const { resolution } = req.body;
    const result = await maintenanceService.resolve(req.params.id, resolution, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
