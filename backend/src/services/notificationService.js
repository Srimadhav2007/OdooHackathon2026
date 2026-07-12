/**
 * services/notificationService.js
 * Creates Notification records in the DB and emits Socket.io events.
 */

const { PrismaClient } = require('@prisma/client');
const { emitToUser } = require('../socket');

const prisma = new PrismaClient();

/**
 * Create a notification and push it to the recipient's socket room.
 */
async function send(recipientId, type, message, refId = null, refType = null) {
  try {
    const notification = await prisma.notification.create({
      data: { 
        recipientId: BigInt(recipientId), 
        type, 
        message, 
        refId: refId ? BigInt(refId) : null, 
        refType 
      },
    });
    emitToUser(recipientId.toString(), 'notification:new', notification);
    return notification;
  } catch (err) {
    console.error('[NotificationService] Failed to send:', err.message);
  }
}

/**
 * Batch send to multiple recipients.
 */
async function sendToMany(recipientIds, type, message, refId, refType) {
  return Promise.all(recipientIds.map((id) => send(id, type, message, refId, refType)));
}

/**
 * Send overdue return alerts for all past-due allocations.
 */
async function sendOverdueAlerts() {
  try {
    const overdue = await prisma.allocation.findMany({
      where: { status: 'ACTIVE', expectedReturn: { lt: new Date() } },
      include: {
        asset: { select: { tag: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    for (const alloc of overdue) {
      if (alloc.employeeId) {
        await send(
          alloc.employeeId,
          'OVERDUE_RETURN',
          `Asset ${alloc.asset.tag} (${alloc.asset.name}) is overdue for return.`,
          alloc.id,
          'ALLOCATION'
        );
      }
    }

    console.log(`[Scheduler] Sent ${overdue.length} overdue return alert(s).`);
  } catch (err) {
    console.error('[Scheduler] Overdue check failed:', err.message);
  }
}

module.exports = { send, sendToMany, sendOverdueAlerts };
