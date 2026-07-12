/**
 * services/notificationService.js
 * Creates Notification records in the DB and emits Socket.io events.
 */

const pool = require('../config/db');
const { emitToUser } = require('../socket');

/**
 * Create a notification and push it to the recipient's socket room.
 *
 * @param {string|number} recipientId - Employee ID
 * @param {string} type - NotificationType enum value
 * @param {string} message - Human-readable notification text
 * @param {string|number} [refId] - Related entity ID (optional)
 * @param {string} [refType] - Related entity type (optional)
 */
async function send(recipientId, type, message, refId = null, refType = null) {
  try {
<<<<<<< HEAD
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
=======
    const result = await pool.query(
      `
      INSERT INTO notification (recipient_id, type, message, ref_id, ref_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id, 
        recipient_id AS "recipientId", 
        type, 
        message, 
        is_read AS "isRead", 
        ref_id AS "refId", 
        ref_type AS "refType", 
        created_at AS "createdAt"
      `,
      [recipientId, type, message, refId, refType]
    );

    const notification = result.rows[0];
    emitToUser(recipientId, 'notification:new', notification);
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
>>>>>>> 1052e57 (Updated the backend)
  }
}

/**
 * Batch send to multiple recipients.
 */
async function sendToMany(recipientIds, type, message, refId = null, refType = null) {
  return Promise.all(recipientIds.map((id) => send(id, type, message, refId, refType)));
}

/**
 * Send overdue return alerts for all past-due allocations.
 */
async function sendOverdueAlerts() {
  try {
    console.log('[Scheduler] Checking overdue returns...');
    // Query active allocations where expected_return is in the past
    const result = await pool.query(
      `
      SELECT 
        a.id, 
        a.employee_id, 
        a.asset_id, 
        ast.tag AS asset_tag, 
        ast.name AS asset_name
      FROM allocation a
      JOIN asset ast ON a.asset_id = ast.id
      WHERE a.status = 'ACTIVE' AND a.expected_return < CURRENT_DATE
      `
    );

    const overdueAllocations = result.rows;
    if (overdueAllocations.length === 0) {
      return;
    }

    // Get all Asset Managers and Admins to notify them as well
    const managersResult = await pool.query(
      `SELECT id FROM employee WHERE role IN ('ASSET_MANAGER', 'ADMIN') AND status = true`
    );
    const managerIds = managersResult.rows.map(r => r.id);

    for (const alloc of overdueAllocations) {
      const message = `Asset ${alloc.asset_name} (Tag: ${alloc.asset_tag}) is overdue for return.`;
      
      // Notify the employee
      if (alloc.employee_id) {
        await send(alloc.employee_id, 'OVERDUE_RETURN', message, alloc.id, 'ALLOCATION');
      }

      // Notify the Asset Managers / Admins
      for (const mgrId of managerIds) {
        // Don't notify the employee twice if they happen to be a manager
        if (mgrId !== alloc.employee_id) {
          await send(mgrId, 'OVERDUE_RETURN', message, alloc.id, 'ALLOCATION');
        }
      }
    }
  } catch (err) {
    console.error('Error sending overdue alerts:', err);
  }
}

module.exports = { send, sendToMany, sendOverdueAlerts };
