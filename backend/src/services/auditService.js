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
 * @param {string} cycleId
 * @param {object} actor - req.user (Admin)
 */
async function closeCycle(cycleId, actor) {
  const bCycleId = BigInt(cycleId);
  const bActorId = BigInt(actor.id);

  const cycle = await prisma.auditCycle.findUnique({
    where: { id: bCycleId }
  });

  if (!cycle) {
    throw Object.assign(new Error('Audit cycle not found'), { status: 404 });
  }

  if (cycle.status === 'CLOSED') {
    throw Object.assign(new Error('Audit cycle is already closed'), { status: 400 });
  }

  // Fetch all audit results for this cycle
  const results = await prisma.auditResult.findMany({
    where: { cycleId: bCycleId }
  });

  let missingCount = 0;
  let damagedCount = 0;
  let verifiedCount = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Close the cycle
    await tx.auditCycle.update({
      where: { id: bCycleId },
      data: { status: 'CLOSED' }
    });

    // 2. Loop through results and update asset properties
    for (const res of results) {
      if (res.verdict === 'MISSING') {
        missingCount++;
        await tx.asset.update({
          where: { id: res.assetId },
          data: { status: 'LOST' }
        });
      } else if (res.verdict === 'DAMAGED') {
        damagedCount++;
        await tx.asset.update({
          where: { id: res.assetId },
          data: { condition: 'DAMAGED' }
        });
      } else {
        verifiedCount++;
      }
    }

    // 3. Log activity
    await tx.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'CLOSED_AUDIT_CYCLE',
        entity: 'AUDIT_CYCLE',
        entityId: bCycleId,
        metadata: { missing: missingCount, damaged: damagedCount, verified: verifiedCount }
      }
    });
  });

  // Fetch auditors to notify them
  const assignments = await prisma.auditAssignment.findMany({
    where: { cycleId: bCycleId },
    select: { auditorId: true }
  });
  const auditorIds = assignments.map(a => a.auditorId);

  const msg = `Audit cycle "${cycle.name}" has been closed by Admin. Summary: Missing: ${missingCount}, Damaged: ${damagedCount}, Verified: ${verifiedCount}.`;
  await notificationService.sendToMany(auditorIds, 'AUDIT_DISCREPANCY', msg, bCycleId, 'AUDIT');

  return { missing: missingCount, damaged: damagedCount, verified: verifiedCount };
}

module.exports = { closeCycle };
