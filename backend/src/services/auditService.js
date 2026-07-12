/**
 * services/auditService.js
 * Business logic for audit cycle lifecycle.
 *
 * Closing a cycle is IRREVERSIBLE:
 *  - Assets with verdict MISSING → status = LOST
 *  - Assets with verdict DAMAGED → condition = DAMAGED
 */

const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Close an audit cycle and apply discrepancy results to asset statuses.
 *
 * @param {string} cycleId
 * @param {object} actor - req.user (Admin)
 */
async function closeCycle(cycleId, actor) {
  // TODO (Member B):
  // 1. Fetch cycle; verify status !== CLOSED (already closed = 400)
  // 2. Fetch all AuditResults for this cycle
  // 3. For MISSING results: set asset.status = LOST
  // 4. For DAMAGED results: set asset.condition = DAMAGED
  // 5. Set cycle.status = CLOSED
  // 6. Notify assigned auditors and admin
  // 7. Log ActivityLog
  // 8. Return discrepancy summary { missing: N, damaged: N, verified: N }
  throw new Error('TODO: implement auditService.closeCycle()');
}

module.exports = { closeCycle };
