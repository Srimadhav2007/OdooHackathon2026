/**
 * services/allocationService.js
 * Core business logic for asset allocation and transfer conflict detection.
 */

const { PrismaClient } = require('@prisma/client');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Allocate an asset to an employee or department.
 * Throws a structured error if the asset is already allocated.
 *
 * @param {object} data - { assetId, employeeId?, departmentId?, expectedReturn?, conditionNotes? }
 * @param {object} actor - req.user (the Asset Manager performing the action)
 */
async function allocate(data, actor) {
  const { assetId, employeeId, departmentId, expectedReturn, conditionNotes } = data;

  if (!assetId) {
    throw Object.assign(new Error('Asset ID is required'), { status: 400 });
  }
  if (!employeeId && !departmentId) {
    throw Object.assign(new Error('Either Employee ID or Department ID must be provided'), { status: 400 });
  }

  const bAssetId = BigInt(assetId);
  const bEmployeeId = employeeId ? BigInt(employeeId) : null;
  const bDepartmentId = departmentId ? BigInt(departmentId) : null;
  const bActorId = BigInt(actor.id);

  // 1. Fetch asset
  const asset = await prisma.asset.findUnique({ where: { id: bAssetId } });
  if (!asset) {
    throw Object.assign(new Error('Asset not found'), { status: 404 });
  }

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

  // 5. Notify the recipient (employee or department head)
  let recipientId = bEmployeeId;
  if (!recipientId && bDepartmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: bDepartmentId },
      select: { headId: true }
    });
    recipientId = dept?.headId || null;
  }

  if (recipientId) {
    const msg = `Asset "${asset.name}" has been allocated to you.`;
    await notificationService.send(recipientId, 'ASSET_ASSIGNED', msg, allocation.id, 'ALLOCATION');
  }

  // 6. Broadcast dashboard refresh
  broadcastDashboardRefresh();

  return allocation;
}

/**
 * Mark an allocation as returned.
 */
async function returnAsset(allocationId, conditionNotes, actor) {
  const bAllocationId = BigInt(allocationId);
  const bActorId = BigInt(actor.id);

  const allocation = await prisma.allocation.findUnique({
    where: { id: bAllocationId },
    include: { asset: true, employee: true },
  });

  if (!allocation) {
    throw Object.assign(new Error('Allocation not found'), { status: 404 });
  }

  if (allocation.status !== 'ACTIVE' && allocation.status !== 'TRANSFER_REQUESTED') {
    throw Object.assign(new Error('Allocation is not active'), { status: 400 });
  }

  const updatedAllocation = await prisma.$transaction(async (tx) => {
    // 1. Update allocation status
    const updated = await tx.allocation.update({
      where: { id: bAllocationId },
      data: {
        status: 'RETURNED',
        actualReturn: new Date(),
        conditionNotes: conditionNotes || allocation.conditionNotes,
      },
    });

    // 2. Set asset status to AVAILABLE
    await tx.asset.update({
      where: { id: allocation.assetId },
      data: { status: 'AVAILABLE' },
    });

    // 3. Log activity
    await tx.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'RETURNED_ASSET',
        entity: 'ASSET',
        entityId: allocation.assetId,
        metadata: { allocationId: bAllocationId.toString(), conditionNotes },
      },
    });

    // 4. Update any pending transfer request for this allocation to REJECTED
    await tx.transferRequest.updateMany({
      where: { allocationId: bAllocationId, status: 'PENDING' },
      data: { status: 'REJECTED' }
    });

    return updated;
  });

  // 5. Send notification to user
  if (allocation.employeeId) {
    const msg = `Asset "${allocation.asset.name}" allocated to you has been successfully returned.`;
    await notificationService.send(allocation.employeeId, 'ASSET_RETURNED', msg, bAllocationId, 'ALLOCATION');
  }

  // 6. Broadcast dashboard refresh
  broadcastDashboardRefresh();

  return updatedAllocation;
}

/**
 * Query all overdue allocations (expectedReturn < now AND status = ACTIVE).
 */
async function getOverdue() {
  const overdue = await prisma.allocation.findMany({
    where: {
      status: 'ACTIVE',
      expectedReturn: { lt: new Date() }
    },
    include: {
      asset: { select: { id: true, name: true, tag: true } },
      employee: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } }
    },
    orderBy: { expectedReturn: 'asc' }
  });
  return overdue;
}

module.exports = { allocate, returnAsset, getOverdue };
