/**
 * services/maintenanceService.js
 * State machine for maintenance request workflow.
 */

const pool = require('../config/db');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

/**
 * Approve a maintenance request and optionally assign a technician.
 */
async function approve(requestId, technicianId, actor) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Find request; verify status = PENDING
    const reqRes = await client.query('SELECT * FROM maintenance_request WHERE id = $1', [requestId]);
    if (reqRes.rows.length === 0) {
      throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
    }
    const request = reqRes.rows[0];

    if (request.status !== 'PENDING') {
      throw Object.assign(new Error(`Request status must be PENDING, currently: ${request.status}`), { status: 400 });
    }

    // 2. Update: status = TECHNICIAN_ASSIGNED (or APPROVED if no tech), approved_by_id = actor.id
    const targetStatus = technicianId ? 'TECHNICIAN_ASSIGNED' : 'APPROVED';
    const techId = technicianId || null;

    const updateRes = await client.query(
      `
      UPDATE maintenance_request
      SET status = $1, approved_by_id = $2, technician_id = $3
      WHERE id = $4
      RETURNING *
      `,
      [targetStatus, actor.id, techId, requestId]
    );
    const updatedRequest = updateRes.rows[0];

    // 3. Set asset.status = UNDER_MAINTENANCE
    await client.query(
      `UPDATE asset SET status = 'UNDER_MAINTENANCE' WHERE id = $1`,
      [request.asset_id]
    );

    // 4. Notify requester of approval + tech assignment
    const msg = `Your maintenance request for asset ID ${request.asset_id} has been approved. Status: ${targetStatus}.`;
    await notificationService.send(request.raised_by_id, 'MAINTENANCE_APPROVED', msg, requestId, 'MAINTENANCE');

    // Also notify technician if assigned
    if (techId) {
      const techMsg = `You have been assigned to a maintenance request (ID: ${requestId}) for asset ID ${request.asset_id}.`;
      await notificationService.send(techId, 'MAINTENANCE_RAISED', techMsg, requestId, 'MAINTENANCE');
    }

    // 5. Log + broadcast
    await client.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'APPROVED_MAINTENANCE', 'MAINTENANCE_REQUEST', $2, $3)
      `,
      [
        actor.id,
        requestId,
        JSON.stringify({ assetId: request.asset_id, status: targetStatus, technicianId: techId })
      ]
    );

    await client.query('COMMIT');

    broadcastDashboardRefresh();

    return updatedRequest;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Resolve a maintenance request and return asset to Available.
 */
async function resolve(requestId, resolution, actor) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Find request; verify status = IN_PROGRESS or TECHNICIAN_ASSIGNED or APPROVED
    const reqRes = await client.query('SELECT * FROM maintenance_request WHERE id = $1', [requestId]);
    if (reqRes.rows.length === 0) {
      throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
    }
    const request = reqRes.rows[0];

    const validStates = ['IN_PROGRESS', 'TECHNICIAN_ASSIGNED', 'APPROVED'];
    if (!validStates.includes(request.status)) {
      throw Object.assign(new Error(`Cannot resolve request in status: ${request.status}`), { status: 400 });
    }

    // 2. Update: status = RESOLVED, resolved_at = now, resolution notes
    const updateRes = await client.query(
      `
      UPDATE maintenance_request
      SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, resolution = $1
      WHERE id = $2
      RETURNING *
      `,
      [resolution || null, requestId]
    );
    const updatedRequest = updateRes.rows[0];

    // 3. Set asset.status = AVAILABLE
    await client.query(
      `UPDATE asset SET status = 'AVAILABLE' WHERE id = $1`,
      [request.asset_id]
    );

    // 4. Notify requester + log + broadcast
    const msg = `Your maintenance request for asset ID ${request.asset_id} has been resolved. Notes: ${resolution || 'None'}`;
    await notificationService.send(request.raised_by_id, 'MAINTENANCE_RESOLVED', msg, requestId, 'MAINTENANCE');

    await client.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'RESOLVED_MAINTENANCE', 'MAINTENANCE_REQUEST', $2, $3)
      `,
      [
        actor.id,
        requestId,
        JSON.stringify({ assetId: request.asset_id, resolution })
      ]
    );

    await client.query('COMMIT');

    broadcastDashboardRefresh();

    return updatedRequest;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { approve, resolve };
