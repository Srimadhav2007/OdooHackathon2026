/**
 * services/maintenanceService.js
 * State machine for maintenance request workflow.
 *
 * States: PENDING → APPROVED / REJECTED → TECHNICIAN_ASSIGNED → IN_PROGRESS → RESOLVED
 * Side effect: asset.status flips to UNDER_MAINTENANCE on APPROVED, back to AVAILABLE on RESOLVED.
 */

const { PrismaClient } = require('@prisma/client');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Approve a maintenance request and optionally assign a technician.
 */
async function approve(requestId, technicianId, actor) {
  // TODO (Member B):
  // 1. Find request; verify status = PENDING
  // 2. Update: status = TECHNICIAN_ASSIGNED (or APPROVED if no tech), approvedById = actor.id
  // 3. Set asset.status = UNDER_MAINTENANCE
  // 4. Notify requester of approval + tech assignment
  // 5. Log + broadcast
  throw new Error('TODO: implement maintenanceService.approve()');
}

/**
 * Resolve a maintenance request and return asset to Available.
 */
async function resolve(requestId, resolution, actor) {
  // TODO (Member B):
  // 1. Find request; verify status = IN_PROGRESS or TECHNICIAN_ASSIGNED
  // 2. Update: status = RESOLVED, resolvedAt = now, resolution notes
  // 3. Set asset.status = AVAILABLE
  // 4. Notify requester + log + broadcast
  throw new Error('TODO: implement maintenanceService.resolve()');
}

module.exports = { approve, resolve };
