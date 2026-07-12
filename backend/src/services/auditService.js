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
<<<<<<< HEAD
  const bCycleId = BigInt(cycleId);
  const bActorId = BigInt(actor.id);

  const cycle = await prisma.auditCycle.findUnique({
    where: { id: bCycleId }
  });

  if (!cycle) {
    throw Object.assign(new Error('Audit cycle not found'), { status: 404 });
  }
=======
  return await prisma.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.findUnique({
      where: { id: BigInt(cycleId) }
    });

    if (!cycle) {
      throw Object.assign(new Error('Audit cycle not found'), { status: 404 });
    }
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a

  if (cycle.status === 'CLOSED') {
    throw Object.assign(new Error('Audit cycle is already closed'), { status: 400 });
  }

<<<<<<< HEAD
  // Fetch all audit results for this cycle
  const results = await prisma.auditResult.findMany({
    where: { cycleId: bCycleId }
  });
=======
    const results = await tx.auditResult.findMany({
      where: { cycleId: BigInt(cycleId) }
    });
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a

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
<<<<<<< HEAD
        missingCount++;
=======
        missing++;
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
        await tx.asset.update({
          where: { id: res.assetId },
          data: { status: 'LOST' }
        });
      } else if (res.verdict === 'DAMAGED') {
<<<<<<< HEAD
        damagedCount++;
=======
        damaged++;
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
        await tx.asset.update({
          where: { id: res.assetId },
          data: { condition: 'DAMAGED' }
        });
<<<<<<< HEAD
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
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a

  const msg = `Audit cycle "${cycle.name}" has been closed by Admin. Summary: Missing: ${missingCount}, Damaged: ${damagedCount}, Verified: ${verifiedCount}.`;
  await notificationService.sendToMany(auditorIds, 'AUDIT_DISCREPANCY', msg, bCycleId, 'AUDIT');

<<<<<<< HEAD
  return { missing: missingCount, damaged: damagedCount, verified: verifiedCount };
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
}

module.exports = { closeCycle };
