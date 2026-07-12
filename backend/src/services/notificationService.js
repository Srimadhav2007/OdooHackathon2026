/**
 * services/notificationService.js
 * Creates Notification records in the DB and emits Socket.io events.
 *
 * Usage: await notificationService.send(recipientId, type, message, refId, refType)
 */

const { PrismaClient } = require('@prisma/client');
const { emitToUser } = require('../socket');

const prisma = new PrismaClient();

/**
 * Create a notification and push it to the recipient's socket room.
 *
 * @param {string} recipientId - Employee ID
 * @param {string} type - NotificationType enum value
 * @param {string} message - Human-readable notification text
 * @param {string} [refId] - Related entity ID (optional)
 * @param {string} [refType] - Related entity type (optional)
 */
async function send(recipientId, type, message, refId = null, refType = null) {
  // TODO (Member B):
  // const notification = await prisma.notification.create({
  //   data: { recipientId, type, message, refId, refType }
  // });
  // emitToUser(recipientId, 'notification:new', notification);
  // return notification;

  console.log(`[Notification] → ${recipientId}: [${type}] ${message}`);
}

/**
 * Batch send to multiple recipients.
 */
async function sendToMany(recipientIds, type, message, refId, refType) {
  return Promise.all(recipientIds.map((id) => send(id, type, message, refId, refType)));
}

/**
 * Send overdue return alerts for all past-due allocations.
 * Call this on a schedule (setInterval every hour for hackathon).
 */
async function sendOverdueAlerts() {
  // TODO (Member B):
  // 1. Query allocations where expectedReturn < now AND status = ACTIVE
  // 2. For each: send OVERDUE_RETURN notification to employee + asset manager
  console.log('[Scheduler] Checking overdue returns...');
}

module.exports = { send, sendToMany, sendOverdueAlerts };
