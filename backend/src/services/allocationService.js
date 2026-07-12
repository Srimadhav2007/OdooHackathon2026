/**
 * services/allocationService.js
 * Core business logic for asset allocation and transfer conflict detection.
 *
 * KEY RULE: An asset can have at most ONE active allocation at a time.
 * Attempting to allocate an already-allocated asset returns a conflict error
 * with the current holder's name (not a generic 400).
 */

const { PrismaClient } = require('@prisma/client');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Allocate an asset to an employee or department.
 * Throws a structured error if the asset is already allocated.
 *
 * @param {object} data - { assetId, employeeId?, departmentId?, expectedReturn? }
 * @param {object} actor - req.user (the Asset Manager performing the action)
 */
async function allocate(data, actor) {
  const { assetId, employeeId, departmentId, expectedReturn } = data;

  // TODO (Member B):
  // 1. Fetch asset; throw 404 if not found
  // 2. Check for existing active allocation:
  //    const existing = await prisma.allocation.findFirst({
  //      where: { assetId, status: 'ACTIVE' },
  //      include: { employee: true, department: true }
  //    });
  // 3. If exists: throw conflict error:
  //    const holder = existing.employee?.name ?? existing.department?.name;
  //    throw Object.assign(new Error(`Currently held by ${holder}`), { status: 409, currentHolder: holder });
  // 4. Create allocation record
  // 5. Update asset.status = 'ALLOCATED'
  // 6. Send notification to the allocated employee
  // 7. Log ActivityLog
  // 8. broadcastDashboardRefresh()
  // 9. Return new allocation

  throw new Error('TODO: implement allocationService.allocate()');
}

/**
 * Mark an allocation as returned.
 */
async function returnAsset(allocationId, conditionNotes, actor) {
  // TODO (Member B):
  // 1. Find allocation; verify status = ACTIVE
  // 2. Set status = RETURNED, actualReturn = now, conditionNotes
  // 3. Set asset.status = AVAILABLE
  // 4. Log + notify + broadcast
  throw new Error('TODO: implement allocationService.returnAsset()');
}

/**
 * Query all overdue allocations (expectedReturn < now AND status = ACTIVE).
 * Called by the reports route and the notification scheduler.
 */
async function getOverdue() {
  // TODO (Member B):
  // return await prisma.allocation.findMany({
  //   where: { status: 'ACTIVE', expectedReturn: { lt: new Date() } },
  //   include: { asset: true, employee: true, department: true }
  // });
  return [];
}

module.exports = { allocate, returnAsset, getOverdue };
