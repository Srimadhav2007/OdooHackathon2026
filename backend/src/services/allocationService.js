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
 */
async function allocate(data, actor) {
  const { assetId, employeeId, departmentId, expectedReturn, conditionNotes } = data;

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
    );
  }

  // 6. Broadcast dashboard refresh (real-time stats update)
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

  if (!allocation) throw Object.assign(new Error('Allocation not found'), { status: 404 });
  if (allocation.status !== 'ACTIVE') throw Object.assign(new Error('Allocation is not active'), { status: 400 });

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

  if (allocation.employeeId) {
    await notificationService.send(
      allocation.employeeId,
      'ASSET_RETURNED',
      `Your assignment for asset ${allocation.asset.tag} has been marked as returned.`,
      allocation.id,
      'ALLOCATION'
    );
  }

  broadcastDashboardRefresh();
  return { message: 'Asset returned successfully' };
}

/**
 * Query all overdue allocations
 */
async function getOverdue() {
  return await prisma.allocation.findMany({
    where: { status: 'ACTIVE', expectedReturn: { lt: new Date() } },
    include: { asset: true, employee: true, department: true },
  });
}

module.exports = { allocate, returnAsset, getOverdue };
