/**
 * routes/allocations.js — Asset Allocation & Transfer workflow
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager, requireDeptHead } = require('../middleware/roleGuard');
const allocationService = require('../services/allocationService');
const notificationService = require('../services/notificationService');

// Helper to map DB row to response structure
function mapAllocationRow(row) {
  return {
    id: row.id,
    assetId: row.assetId,
    employeeId: row.employeeId,
    departmentId: row.departmentId,
    status: row.status,
    expectedReturn: row.expectedReturn,
    actualReturn: row.actualReturn,
    conditionNotes: row.conditionNotes,
    createdAt: row.createdAt,
    asset: {
      id: row.assetId,
      name: row.asset_name,
      tag: row.asset_tag
    },
    employee: row.employeeId ? {
      id: row.employeeId,
      name: row.employee_name
    } : null,
    department: row.departmentId ? {
      id: row.departmentId,
      name: row.department_name
    } : null
  };
}

// GET /api/allocations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, assetId, employeeId, overdue } = req.query;
<<<<<<< HEAD
    
    // Role-based filtering
    let baseFilter = {};
    if (req.user.role === 'EMPLOYEE') {
      baseFilter.employeeId = BigInt(req.user.id);
    } else if (req.user.role === 'DEPT_HEAD') {
      // Allow fetching for all employees in their department
      const deptEmployees = await prisma.employee.findMany({
        where: { departmentId: BigInt(req.user.departmentId) },
        select: { id: true },
      });
      const empIds = deptEmployees.map(e => e.id);
      baseFilter.employeeId = { in: empIds };
    }

    const where = {
      ...baseFilter,
      ...(status && { status }),
      ...(assetId && { assetId: BigInt(assetId) }),
      ...(employeeId && req.user.role !== 'EMPLOYEE' && { employeeId: BigInt(employeeId) }),
      ...(overdue === 'true' && { status: 'ACTIVE', expectedReturn: { lt: new Date() } }),
    };
=======
    const actor = req.user;

    let query = `
      SELECT 
        a.id, 
        a.asset_id AS "assetId", 
        a.employee_id AS "employeeId", 
        a.department_id AS "departmentId", 
        a.status, 
        a.expected_return AS "expectedReturn", 
        a.actual_return AS "actualReturn", 
        a.condition_notes AS "conditionNotes", 
        a.created_at AS "createdAt",
        ast.name AS asset_name,
        ast.tag AS asset_tag,
        emp.name AS employee_name,
        dept.name AS department_name
      FROM allocation a
      JOIN asset ast ON a.asset_id = ast.id
      LEFT JOIN employee emp ON a.employee_id = emp.id
      LEFT JOIN department dept ON a.department_id = dept.id
      WHERE 1=1
    `;
    const params = [];
>>>>>>> 1052e57 (Updated the backend)

    // 1. Role-based scope filtering
    if (actor.role === 'EMPLOYEE') {
      query += ` AND a.employee_id = $${params.length + 1}`;
      params.push(actor.id);
    } else if (actor.role === 'DEPT_HEAD') {
      // DeptHead sees allocations to their department or employees of their department
      const managedDeptsRes = await pool.query('SELECT id FROM department WHERE head_employee_id = $1', [actor.id]);
      if (managedDeptsRes.rows.length > 0) {
        const deptIds = managedDeptsRes.rows.map(r => r.id);
        query += ` AND (a.department_id = ANY($${params.length + 1}) OR emp.department_id = ANY($${params.length + 1}))`;
        params.push(deptIds);
      } else {
        // Fallback to department they belong to
        if (actor.department_id) {
          query += ` AND (a.department_id = $${params.length + 1} OR emp.department_id = $${params.length + 1})`;
          params.push(actor.department_id);
        } else {
          query += ` AND a.employee_id = $${params.length + 1}`;
          params.push(actor.id);
        }
      }
    }

    // 2. Query filters
    if (status) {
      query += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    if (assetId) {
      query += ` AND a.asset_id = $${params.length + 1}`;
      params.push(assetId);
    }

    if (employeeId) {
      query += ` AND a.employee_id = $${params.length + 1}`;
      params.push(employeeId);
    }

    if (overdue === 'true') {
      query += ` AND a.status = 'ACTIVE' AND a.expected_return < CURRENT_DATE`;
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapAllocationRow));
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations
router.post('/', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const result = await allocationService.allocate(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/allocations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const allocation = await prisma.allocation.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        asset: true,
        employee: { select: { id: true, name: true, email: true } },
        department: true,
        transferRequest: { include: { requestedBy: { select: { name: true } }, approvedBy: { select: { name: true } } } },
      },
    });

    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    
    // Security: employees can only view their own allocations
    if (req.user.role === 'EMPLOYEE' && allocation.employeeId !== BigInt(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
=======
    const { id } = req.params;
    const query = `
      SELECT 
        a.id, 
        a.asset_id AS "assetId", 
        a.employee_id AS "employeeId", 
        a.department_id AS "departmentId", 
        a.status, 
        a.expected_return AS "expectedReturn", 
        a.actual_return AS "actualReturn", 
        a.condition_notes AS "conditionNotes", 
        a.created_at AS "createdAt",
        ast.name AS asset_name,
        ast.tag AS asset_tag,
        emp.name AS employee_name,
        dept.name AS department_name
      FROM allocation a
      JOIN asset ast ON a.asset_id = ast.id
      LEFT JOIN employee emp ON a.employee_id = emp.id
      LEFT JOIN department dept ON a.department_id = dept.id
      WHERE a.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Allocation not found' });
>>>>>>> 1052e57 (Updated the backend)
    }

    const allocation = mapAllocationRow(result.rows[0]);
    res.json(allocation);
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/:id/return
router.put('/:id/return', authenticate, requireAssetManager, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const result = await allocationService.returnAsset(BigInt(req.params.id), req.body.conditionNotes, req.user);
=======
    const { conditionNotes } = req.body;
    const result = await allocationService.returnAsset(req.params.id, conditionNotes, req.user);
>>>>>>> 1052e57 (Updated the backend)
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations/:id/transfer-request
router.post('/:id/transfer-request', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetEmployeeId, targetDeptId, reason } = req.body;
<<<<<<< HEAD
    const allocationId = BigInt(req.params.id);

    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    if (allocation.status !== 'ACTIVE') return res.status(400).json({ error: 'Only ACTIVE allocations can be transferred' });
    
    // Ensure the requester is the current holder (or an admin/manager acting on their behalf)
    if (req.user.role === 'EMPLOYEE' && allocation.employeeId !== BigInt(req.user.id)) {
      return res.status(403).json({ error: 'You do not own this allocation' });
    }

    const transferRequest = await prisma.$transaction(async (tx) => {
      // 1. Create transfer request
      const request = await tx.transferRequest.create({
        data: {
          allocationId,
          requestedById: BigInt(req.user.id),
          targetEmployeeId: targetEmployeeId ? BigInt(targetEmployeeId) : null,
          targetDeptId: targetDeptId ? BigInt(targetDeptId) : null,
          reason,
          status: 'PENDING',
        },
      });
=======
    const actor = req.user;

    if (!targetEmployeeId && !targetDeptId) {
      return res.status(400).json({ error: 'Target Employee or Target Department is required' });
    }

    const client = await pool.connect();
>>>>>>> 1052e57 (Updated the backend)

    try {
      await client.query('BEGIN');

      // Fetch allocation
      const allocRes = await client.query('SELECT * FROM allocation WHERE id = $1', [id]);
      if (allocRes.rows.length === 0) {
        throw Object.assign(new Error('Allocation not found'), { status: 404 });
      }
      const allocation = allocRes.rows[0];

<<<<<<< HEAD
    console.log(`[Transfer] New request ${transferRequest.id} created by ${req.user.name}`);
=======
      if (allocation.status !== 'ACTIVE') {
        throw Object.assign(new Error('Transfer can only be requested for active allocations'), { status: 400 });
      }
>>>>>>> 1052e57 (Updated the backend)

      // 1. Verify req.user is current holder or manager
      const isHolder = allocation.employee_id && allocation.employee_id.toString() === actor.id.toString();
      const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
      
      if (!isHolder && !isManager) {
        // Also check if they are DeptHead of the department holding the asset
        if (actor.role === 'DEPT_HEAD') {
          const deptCheck = await client.query('SELECT id FROM department WHERE id = $1 AND head_employee_id = $2', [allocation.department_id, actor.id]);
          if (deptCheck.rows.length === 0) {
            throw Object.assign(new Error('Access denied. You are not the holder or authorized manager.'), { status: 403 });
          }
        } else {
          throw Object.assign(new Error('Access denied. You are not the holder or authorized manager.'), { status: 403 });
        }
      }

      // 2. Create TransferRequest (status = PENDING)
      const tEmpId = targetEmployeeId || null;
      const tDeptId = targetDeptId || null;

      const transferRes = await client.query(
        `
        INSERT INTO transfer_request (allocation_id, requested_by_id, target_employee_id, target_department_id, reason, status)
        VALUES ($1, $2, $3, $4, $5, 'PENDING')
        RETURNING *
        `,
        [id, actor.id, tEmpId, tDeptId, reason || null]
      );
      const transferRequest = transferRes.rows[0];

      // 3. Set allocation.status = TRANSFER_REQUESTED
      await client.query(
        `UPDATE allocation SET status = 'TRANSFER_REQUESTED' WHERE id = $1`,
        [id]
      );

      // 4. Notify Asset Manager/Dept Head
      // Notify managers
      const managersRes = await client.query("SELECT id FROM employee WHERE role IN ('ASSET_MANAGER', 'ADMIN') AND status = true");
      const managerIds = managersRes.rows.map(r => r.id);

      const msg = `Transfer requested for asset ID ${allocation.asset_id} by ${actor.name}.`;
      await notificationService.sendToMany(managerIds, 'TRANSFER_REQUESTED', msg, transferRequest.id, 'TRANSFER');

      await client.query('COMMIT');
      res.status(201).json(transferRequest);

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

// GET /api/allocations/transfers/pending
router.get('/transfers/pending', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const actor = req.user;

    let query = `
      SELECT 
        tr.id,
        tr.allocation_id AS "allocationId",
        tr.requested_by_id AS "requestedById",
        tr.target_employee_id AS "targetEmployeeId",
        tr.target_department_id AS "targetDepartmentId",
        tr.reason,
        tr.status,
        tr.created_at AS "createdAt",
        req.name AS requester_name,
        tar_emp.name AS target_employee_name,
        tar_dept.name AS target_department_name,
        a.asset_id,
        ast.name AS asset_name,
        ast.tag AS asset_tag
      FROM transfer_request tr
      JOIN allocation a ON tr.allocation_id = a.id
      JOIN asset ast ON a.asset_id = ast.id
      JOIN employee req ON tr.requested_by_id = req.id
      LEFT JOIN employee tar_emp ON tr.target_employee_id = tar_emp.id
      LEFT JOIN department tar_dept ON tr.target_department_id = tar_dept.id
      WHERE tr.status = 'PENDING'
    `;
    const params = [];

    if (actor.role === 'DEPT_HEAD') {
      // Dept head only sees requests involving their managed department
      const deptsRes = await pool.query('SELECT id FROM department WHERE head_employee_id = $1', [actor.id]);
      if (deptsRes.rows.length > 0) {
        const deptIds = deptsRes.rows.map(r => r.id);
        query += ` AND (tr.target_department_id = ANY($1) OR a.department_id = ANY($1) OR req.department_id = ANY($1))`;
        params.push(deptIds);
      } else {
        // Fallback
        query += ` AND (tr.requested_by_id = $1 OR tr.target_employee_id = $1)`;
        params.push(actor.id);
      }
    }

    query += ` ORDER BY tr.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/transfers/:tid/approve
router.put('/transfers/:tid/approve', authenticate, requireDeptHead, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: BigInt(req.params.tid) },
      include: { allocation: true },
    });
=======
    const { tid } = req.params;
    const actor = req.user;
>>>>>>> 1052e57 (Updated the backend)

    const client = await pool.connect();

<<<<<<< HEAD
    await prisma.$transaction(async (tx) => {
      // 1. Mark transfer request APPROVED
      await tx.transferRequest.update({
        where: { id: transferRequest.id },
        data: { status: 'APPROVED', approvedById: BigInt(req.user.id) },
      });
=======
    try {
      await client.query('BEGIN');
>>>>>>> 1052e57 (Updated the backend)

      // 1. Fetch TransferRequest
      const trRes = await client.query('SELECT * FROM transfer_request WHERE id = $1', [tid]);
      if (trRes.rows.length === 0) {
        throw Object.assign(new Error('Transfer request not found'), { status: 404 });
      }
      const tr = trRes.rows[0];

<<<<<<< HEAD
      // 3. Create new allocation
      await tx.allocation.create({
        data: {
          assetId: transferRequest.allocation.assetId,
          employeeId: transferRequest.targetEmployeeId,
          departmentId: transferRequest.targetDeptId,
          status: 'ACTIVE',
        },
      });
      
      // 4. Log it
      await tx.activityLog.create({
        data: {
          actorId: BigInt(req.user.id),
          action: 'APPROVED_TRANSFER',
          entity: 'TRANSFER_REQUEST',
          entityId: transferRequest.id,
        },
      });
    });
=======
      if (tr.status !== 'PENDING') {
        throw Object.assign(new Error('Transfer request is not pending'), { status: 400 });
      }
>>>>>>> 1052e57 (Updated the backend)

      // Fetch original allocation
      const allocRes = await client.query('SELECT * FROM allocation WHERE id = $1', [tr.allocation_id]);
      const oldAllocation = allocRes.rows[0];

      // Set TransferRequest.status = APPROVED, approvedById = req.user.id
      await client.query(
        `UPDATE transfer_request SET status = 'APPROVED', approved_by_id = $1 WHERE id = $2`,
        [actor.id, tid]
      );

      // Close old allocation (status = TRANSFERRED)
      await client.query(
        `UPDATE allocation SET status = 'TRANSFERRED', actual_return = CURRENT_TIMESTAMP WHERE id = $1`,
        [tr.allocation_id]
      );

      // Create new Allocation for target employee/dept
      const insertAllocRes = await client.query(
        `
        INSERT INTO allocation (asset_id, employee_id, department_id, status, expected_return)
        VALUES ($1, $2, $3, 'ACTIVE', $4)
        RETURNING *
        `,
        [oldAllocation.asset_id, tr.target_employee_id, tr.target_department_id, oldAllocation.expected_return]
      );
      const newAllocation = insertAllocRes.rows[0];

      // Fetch asset name
      const assetRes = await client.query('SELECT name FROM asset WHERE id = $1', [oldAllocation.asset_id]);
      const assetName = assetRes.rows[0]?.name || 'Asset';

      // Notify requester (approval)
      const requesterMsg = `Your transfer request for asset "${assetName}" has been approved.`;
      await notificationService.send(tr.requested_by_id, 'TRANSFER_APPROVED', requesterMsg, tid, 'TRANSFER');

      // Notify target employee if applicable
      if (tr.target_employee_id) {
        const targetMsg = `Asset "${assetName}" has been transferred to you.`;
        await notificationService.send(tr.target_employee_id, 'ASSET_ASSIGNED', targetMsg, newAllocation.id, 'ALLOCATION');
      }

      // Log action
      await client.query(
        `
        INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
        VALUES ($1, 'APPROVED_TRANSFER', 'TRANSFER_REQUEST', $2, $3)
        `,
        [
          actor.id,
          tid,
          JSON.stringify({ assetId: oldAllocation.asset_id, oldAllocationId: oldAllocation.id, newAllocationId: newAllocation.id })
        ]
      );

      await client.query('COMMIT');
      res.json({ message: 'Transfer approved successfully', newAllocation });

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

// PUT /api/allocations/transfers/:tid/reject
router.put('/transfers/:tid/reject', authenticate, requireDeptHead, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: BigInt(req.params.tid) },
      include: { allocation: true },
    });
=======
    const { tid } = req.params;
    const actor = req.user;
>>>>>>> 1052e57 (Updated the backend)

    const client = await pool.connect();

<<<<<<< HEAD
    await prisma.$transaction([
      prisma.transferRequest.update({
        where: { id: transferRequest.id },
        data: { status: 'REJECTED', approvedById: BigInt(req.user.id) }, 
      }),
      prisma.allocation.update({
        where: { id: transferRequest.allocationId },
        data: { status: 'ACTIVE' }, 
      }),
      prisma.activityLog.create({
        data: {
          actorId: BigInt(req.user.id),
          action: 'REJECTED_TRANSFER',
          entity: 'TRANSFER_REQUEST',
          entityId: transferRequest.id,
        },
      }),
    ]);
=======
    try {
      await client.query('BEGIN');
>>>>>>> 1052e57 (Updated the backend)

      // 1. Fetch TransferRequest
      const trRes = await client.query('SELECT * FROM transfer_request WHERE id = $1', [tid]);
      if (trRes.rows.length === 0) {
        throw Object.assign(new Error('Transfer request not found'), { status: 404 });
      }
      const tr = trRes.rows[0];

      if (tr.status !== 'PENDING') {
        throw Object.assign(new Error('Transfer request is not pending'), { status: 400 });
      }

      // Set TransferRequest.status = REJECTED
      await client.query(
        `UPDATE transfer_request SET status = 'REJECTED' WHERE id = $1`,
        [tid]
      );

      // Revert allocation.status = ACTIVE
      await client.query(
        `UPDATE allocation SET status = 'ACTIVE' WHERE id = $1`,
        [tr.allocation_id]
      );

      // Notify requester
      const assetRes = await client.query(
        `SELECT ast.name FROM allocation a JOIN asset ast ON a.asset_id = ast.id WHERE a.id = $1`,
        [tr.allocation_id]
      );
      const assetName = assetRes.rows[0]?.name || 'Asset';

      const requesterMsg = `Your transfer request for asset "${assetName}" has been rejected.`;
      await notificationService.send(tr.requested_by_id, 'TRANSFER_REJECTED', requesterMsg, tid, 'TRANSFER');

      await client.query('COMMIT');
      res.json({ message: 'Transfer request rejected successfully' });

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

module.exports = router;
