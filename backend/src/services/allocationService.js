/**
 * services/allocationService.js
 * Core business logic for asset allocation and transfer conflict detection.
 */

const pool = require('../config/db');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

/**
 * Allocate an asset to an employee or department.
 * Throws a structured error if the asset is already allocated.
 *
 * @param {object} data - { assetId, employeeId?, departmentId?, expectedReturn? }
 * @param {object} actor - req.user (the Asset Manager performing the action)
 */
async function allocate(data, actor) {
  const { assetId, employeeId, departmentId, expectedReturn } = data;

<<<<<<< HEAD
  if (!assetId) throw Object.assign(new Error('assetId is required'), { status: 400 });
  if (!employeeId && !departmentId) throw Object.assign(new Error('employeeId or departmentId is required'), { status: 400 });

  const bAssetId = BigInt(assetId);
  const bEmployeeId = employeeId ? BigInt(employeeId) : null;
  const bDepartmentId = departmentId ? BigInt(departmentId) : null;
  const bActorId = BigInt(actor.id);

  // 1. Fetch asset
  const asset = await prisma.asset.findUnique({ where: { id: bAssetId } });
  if (!asset) throw Object.assign(new Error('Asset not found'), { status: 404 });

  // 2. Check for existing active allocation
  const existing = await prisma.allocation.findFirst({
    where: { assetId: bAssetId, status: 'ACTIVE' },
    include: { employee: true, department: true },
  });

  // 3. Conflict detection
  if (existing) {
    const holder = existing.employee?.name ?? existing.department?.name ?? 'Unknown';
    throw Object.assign(new Error(`Asset is currently held by ${holder}`), { status: 409, currentHolder: holder });
  }

  // 4. Create allocation & update asset status in a transaction
  const [allocation] = await prisma.$transaction([
    prisma.allocation.create({
      data: {
        assetId: bAssetId,
        employeeId: bEmployeeId,
        departmentId: bDepartmentId,
        expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
        conditionNotes: conditionNotes || null,
        status: 'ACTIVE',
      },
      include: { employee: true, department: true, asset: true },
    }),
    prisma.asset.update({
      where: { id: bAssetId },
      data: { status: 'ALLOCATED' },
    }),
    prisma.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'ALLOCATED_ASSET',
        entity: 'ASSET',
        entityId: bAssetId,
        metadata: { employeeId: bEmployeeId?.toString(), departmentId: bDepartmentId?.toString() },
      },
    }),
  ]);

  // 5. Notify the allocated employee
  if (bEmployeeId) {
    await notificationService.send(
      bEmployeeId,
      'ASSET_ASSIGNED',
      `You have been assigned asset: ${asset.tag} (${asset.name})`,
      allocation.id,
      'ALLOCATION'
=======
  if (!assetId) {
    throw Object.assign(new Error('Asset ID is required'), { status: 400 });
  }

  if (!employeeId && !departmentId) {
    throw Object.assign(new Error('Either Employee ID or Department ID must be provided'), { status: 400 });
  }

  // Use a transaction to ensure atomic allocation updates
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch asset
    const assetRes = await client.query('SELECT * FROM asset WHERE id = $1', [assetId]);
    if (assetRes.rows.length === 0) {
      throw Object.assign(new Error('Asset not found'), { status: 404 });
    }
    const asset = assetRes.rows[0];

    // 2. Check for existing active allocation
    const existingRes = await client.query(
      `
      SELECT 
        a.id,
        emp.name AS employee_name,
        dept.name AS department_name
      FROM allocation a
      LEFT JOIN employee emp ON a.employee_id = emp.id
      LEFT JOIN department dept ON a.department_id = dept.id
      WHERE a.asset_id = $1 AND a.status = 'ACTIVE'
      LIMIT 1
      `,
      [assetId]
>>>>>>> 1052e57 (Updated the backend)
    );

    // 3. If exists: throw conflict error
    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      const holder = existing.employee_name || existing.department_name || 'unknown holder';
      throw Object.assign(new Error(`Currently held by ${holder}`), { status: 409, currentHolder: holder });
    }

    // 4. Create allocation record
    const empId = employeeId || null;
    const deptId = departmentId || null;
    const expReturn = expectedReturn ? new Date(expectedReturn) : null;

    const insertAllocRes = await client.query(
      `
      INSERT INTO allocation (asset_id, employee_id, department_id, status, expected_return)
      VALUES ($1, $2, $3, 'ACTIVE', $4)
      RETURNING *
      `,
      [assetId, empId, deptId, expReturn]
    );
    const allocation = insertAllocRes.rows[0];

    // 5. Update asset.status = 'ALLOCATED'
    await client.query(
      "UPDATE asset SET status = 'ALLOCATED' WHERE id = $1",
      [assetId]
    );

    // 6. Send notification to the allocated employee/department head if applicable
    let notificationRecipientId = empId;
    if (!notificationRecipientId && deptId) {
      // Find department head
      const deptRes = await client.query('SELECT head_employee_id FROM department WHERE id = $1', [deptId]);
      if (deptRes.rows.length > 0 && deptRes.rows[0].head_employee_id) {
        notificationRecipientId = deptRes.rows[0].head_employee_id;
      }
    }

    if (notificationRecipientId) {
      const msg = `Asset "${asset.name}" has been allocated to you.`;
      await notificationService.send(notificationRecipientId, 'ASSET_ASSIGNED', msg, allocation.id, 'ALLOCATION');
    }

    // 7. Log ActivityLog
    await client.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'ALLOCATED_ASSET', 'ALLOCATION', $2, $3)
      `,
      [
        actor.id,
        allocation.id,
        JSON.stringify({ assetId, employeeId: empId, departmentId: deptId })
      ]
    );

    await client.query('COMMIT');

    // 8. broadcastDashboardRefresh()
    broadcastDashboardRefresh();

    // 9. Return new allocation
    return allocation;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Mark an allocation as returned.
 */
async function returnAsset(allocationId, conditionNotes, actor) {
<<<<<<< HEAD
  const bAllocationId = BigInt(allocationId);
  const bActorId = BigInt(actor.id);

  const allocation = await prisma.allocation.findUnique({
    where: { id: bAllocationId },
    include: { asset: true, employee: true },
  });
=======
  const client = await pool.connect();
>>>>>>> 1052e57 (Updated the backend)

  try {
    await client.query('BEGIN');

<<<<<<< HEAD
  // Update allocation & asset in transaction
  await prisma.$transaction([
    prisma.allocation.update({
      where: { id: bAllocationId },
      data: {
        status: 'RETURNED',
        actualReturn: new Date(),
        conditionNotes: conditionNotes || allocation.conditionNotes,
      },
    }),
    prisma.asset.update({
      where: { id: allocation.assetId },
      data: { status: 'AVAILABLE' },
    }),
    prisma.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'RETURNED_ASSET',
        entity: 'ASSET',
        entityId: allocation.assetId,
        metadata: { allocationId: bAllocationId.toString(), conditionNotes },
      },
    }),
  ]);
=======
    // 1. Find allocation; verify status = ACTIVE
    const allocRes = await client.query('SELECT * FROM allocation WHERE id = $1', [allocationId]);
    if (allocRes.rows.length === 0) {
      throw Object.assign(new Error('Allocation not found'), { status: 404 });
    }
    const allocation = allocRes.rows[0];
>>>>>>> 1052e57 (Updated the backend)

    if (allocation.status !== 'ACTIVE' && allocation.status !== 'TRANSFER_REQUESTED') {
      throw Object.assign(new Error('Allocation is not active'), { status: 400 });
    }

    // 2. Set status = RETURNED, actualReturn = now, conditionNotes
    const updateAllocRes = await client.query(
      `
      UPDATE allocation 
      SET status = 'RETURNED', actual_return = CURRENT_TIMESTAMP, condition_notes = $1
      WHERE id = $2
      RETURNING *
      `,
      [conditionNotes || null, allocationId]
    );
    const updatedAllocation = updateAllocRes.rows[0];

    // 3. Set asset.status = AVAILABLE
    const assetRes = await client.query(
      `
      UPDATE asset 
      SET status = 'AVAILABLE' 
      WHERE id = $1
      RETURNING name
      `,
      [allocation.asset_id]
    );
    const assetName = assetRes.rows.length > 0 ? assetRes.rows[0].name : 'Asset';

    // 4. Log + notify + broadcast
    if (allocation.employee_id) {
      const msg = `Asset "${assetName}" allocated to you has been successfully returned.`;
      await notificationService.send(allocation.employee_id, 'ASSET_RETURNED', msg, allocationId, 'ALLOCATION');
    }

    await client.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'RETURNED_ASSET', 'ALLOCATION', $2, $3)
      `,
      [
        actor.id,
        allocationId,
        JSON.stringify({ assetId: allocation.asset_id, conditionNotes })
      ]
    );

    await client.query('COMMIT');

    broadcastDashboardRefresh();

    return updatedAllocation;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Query all overdue allocations (expectedReturn < now AND status = ACTIVE).
 */
async function getOverdue() {
  const result = await pool.query(
    `
    SELECT 
      a.id,
      a.asset_id AS "assetId",
      a.employee_id AS "employeeId",
      a.department_id AS "departmentId",
      a.status,
      a.expected_return AS "expectedReturn",
      a.actual_return AS "actualReturn",
      a.condition_notes AS "conditionNotes",
      ast.name AS "assetName",
      ast.tag AS "assetTag",
      emp.name AS "employeeName",
      dept.name AS "departmentName"
    FROM allocation a
    JOIN asset ast ON a.asset_id = ast.id
    LEFT JOIN employee emp ON a.employee_id = emp.id
    LEFT JOIN department dept ON a.department_id = dept.id
    WHERE a.status = 'ACTIVE' AND a.expected_return < CURRENT_DATE
    ORDER BY a.expected_return ASC
    `
  );
  return result.rows;
}

module.exports = { allocate, returnAsset, getOverdue };
