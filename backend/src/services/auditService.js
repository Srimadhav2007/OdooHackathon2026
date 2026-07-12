/**
 * services/auditService.js
 * Business logic for audit cycle lifecycle.
 */

const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Close an audit cycle and apply discrepancy results to asset statuses.
 *
 * @param {string|number} cycleId
 * @param {object} actor - req.user (Admin)
 */
async function closeCycle(cycleId, actor) {
  return await prisma.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.findUnique({
      where: { id: BigInt(cycleId) }
    });

    if (!cycle) {
      throw Object.assign(new Error('Audit cycle not found'), { status: 404 });
    }

    if (cycle.status === 'CLOSED') {
      throw Object.assign(new Error('Audit cycle is already closed'), { status: 400 });
    }

    const results = await tx.auditResult.findMany({
      where: { cycleId: BigInt(cycleId) }
    });

    let missing = 0;
    let damaged = 0;
    let verified = 0;

    for (const res of results) {
      if (res.verdict === 'MISSING') {
        missing++;
        await tx.asset.update({
          where: { id: res.assetId },
          data: { status: 'LOST' }
        });
      } else if (res.verdict === 'DAMAGED') {
        damaged++;
        await tx.asset.update({
          where: { id: res.assetId },
          data: { condition: 'DAMAGED' }
        });
      } else if (res.verdict === 'VERIFIED') {
        verified++;
      }
    }

    await tx.auditCycle.update({
      where: { id: BigInt(cycleId) },
      data: { status: 'CLOSED' }
    });

    const auditors = await tx.auditAssignment.findMany({
      where: { cycleId: BigInt(cycleId) },
      select: { auditorId: true }
    });
    
    const admins = await tx.employee.findMany({
      where: { role: 'ADMIN', status: true },
      select: { id: true }
    });

    const auditorIds = auditors.map(a => a.auditorId.toString());
    const adminIds = admins.map(a => a.id.toString());
    const allRecipientIds = Array.from(new Set([...auditorIds, ...adminIds]));

    const msg = `Audit cycle "${cycle.name}" has been closed. Summary - Verified: ${verified}, Missing: ${missing}, Damaged: ${damaged}.`;
    await notificationService.sendToMany(allRecipientIds, 'AUDIT_DISCREPANCY', msg, cycleId, 'AUDIT');

    await tx.activityLog.create({
      data: {
        actorId: BigInt(actor.id),
        action: 'CLOSED_AUDIT',
        entity: 'AUDIT_CYCLE',
        entityId: BigInt(cycleId),
        metadata: { cycleId: cycleId.toString(), missing, damaged, verified }
      }
    });

    return { missing, damaged, verified };
  });
}

module.exports = { closeCycle };
