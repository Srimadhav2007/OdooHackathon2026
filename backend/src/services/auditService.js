/**
 * services/auditService.js
 * Business logic for audit cycle lifecycle.
 */

const pool = require('../config/db');
const notificationService = require('./notificationService');

/**
 * Close an audit cycle and apply discrepancy results to asset statuses.
 *
 * @param {string|number} cycleId
 * @param {object} actor - req.user (Admin)
 */
async function closeCycle(cycleId, actor) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch cycle; verify status !== CLOSED
    const cycleRes = await client.query('SELECT * FROM audit_cycle WHERE id = $1', [cycleId]);
    if (cycleRes.rows.length === 0) {
      throw Object.assign(new Error('Audit cycle not found'), { status: 404 });
    }
    const cycle = cycleRes.rows[0];

    if (cycle.status === 'CLOSED') {
      throw Object.assign(new Error('Audit cycle is already closed'), { status: 400 });
    }

    // 2. Fetch all AuditResults for this cycle
    const resultsRes = await client.query('SELECT * FROM audit_result WHERE cycle_id = $1', [cycleId]);
    const results = resultsRes.rows;

    let missing = 0;
    let damaged = 0;
    let verified = 0;

    for (const res of results) {
      if (res.verdict === 'MISSING') {
        missing++;
        // 3. For MISSING results: set asset.status = LOST
        await client.query(
          `UPDATE asset SET status = 'LOST' WHERE id = $1`,
          [res.asset_id]
        );
      } else if (res.verdict === 'DAMAGED') {
        damaged++;
        // 4. For DAMAGED results: set asset.condition = DAMAGED
        await client.query(
          `UPDATE asset SET condition = 'DAMAGED' WHERE id = $1`,
          [res.asset_id]
        );
      } else if (res.verdict === 'VERIFIED') {
        verified++;
      }
    }

    // 5. Set cycle.status = CLOSED
    await client.query(
      `UPDATE audit_cycle SET status = 'CLOSED' WHERE id = $1`,
      [cycleId]
    );

    // 6. Notify assigned auditors and admins
    const auditorsRes = await client.query(
      `SELECT auditor_id FROM audit_assignment WHERE cycle_id = $1`,
      [cycleId]
    );
    const auditorIds = auditorsRes.rows.map(r => r.auditor_id);
    
    // Add admin actor ID
    const adminsRes = await client.query(`SELECT id FROM employee WHERE role = 'ADMIN' AND status = true`);
    const adminIds = adminsRes.rows.map(r => r.id);
    const allRecipientIds = Array.from(new Set([...auditorIds, ...adminIds]));

    const msg = `Audit cycle "${cycle.name}" has been closed. Summary - Verified: ${verified}, Missing: ${missing}, Damaged: ${damaged}.`;
    await notificationService.sendToMany(allRecipientIds, 'AUDIT_DISCREPANCY', msg, cycleId, 'AUDIT');

    // 7. Log ActivityLog
    await client.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'CLOSED_AUDIT', 'AUDIT_CYCLE', $2, $3)
      `,
      [
        actor.id,
        cycleId,
        JSON.stringify({ cycleId, missing, damaged, verified })
      ]
    );

    await client.query('COMMIT');

    // 8. Return discrepancy summary
    return { missing, damaged, verified };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { closeCycle };
