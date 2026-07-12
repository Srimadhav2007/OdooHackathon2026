/**
 * services/maintenanceService.js
 * State machine for maintenance request workflow.
 */

const { PrismaClient } = require('@prisma/client');
const { broadcastDashboardRefresh } = require('../socket');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Approve a maintenance request and optionally assign a technician.
 */
async function approve(requestId, technicianId, actor) {
<<<<<<< HEAD
  const bRequestId = BigInt(requestId);
  const bTechId = technicianId ? BigInt(technicianId) : null;
  const bActorId = BigInt(actor.id);

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: bRequestId },
    include: { asset: true }
  });

  if (!request) {
    throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
  }

  if (request.status !== 'PENDING') {
    throw Object.assign(new Error('Only PENDING requests can be approved'), { status: 400 });
  }

  const finalStatus = bTechId ? 'TECHNICIAN_ASSIGNED' : 'APPROVED';

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: bRequestId },
      data: {
        status: finalStatus,
        approvedById: bActorId,
        technicianId: bTechId
=======
  return await prisma.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({
      where: { id: BigInt(requestId) }
    });

    if (!request) {
      throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
    }

    if (request.status !== 'PENDING') {
      throw Object.assign(new Error(`Request status must be PENDING, currently: ${request.status}`), { status: 400 });
    }

    const targetStatus = technicianId ? 'TECHNICIAN_ASSIGNED' : 'APPROVED';
    const techId = technicianId ? BigInt(technicianId) : null;

    const updatedRequest = await tx.maintenanceRequest.update({
      where: { id: BigInt(requestId) },
      data: {
        status: targetStatus,
        approvedById: BigInt(actor.id),
        technicianId: techId
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
      }
    });

    await tx.asset.update({
      where: { id: request.assetId },
      data: { status: 'UNDER_MAINTENANCE' }
    });

<<<<<<< HEAD
    await tx.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'APPROVED_MAINTENANCE',
        entity: 'MAINTENANCE_REQUEST',
        entityId: bRequestId,
        metadata: { status: finalStatus, technicianId: bTechId?.toString() }
      }
    });

    return updated;
  });

  // Notify requester
  await notificationService.send(
    request.raisedById,
    'MAINTENANCE_APPROVED',
    `Your maintenance request for asset "${request.asset.name}" has been approved. Status: ${finalStatus}`,
    bRequestId,
    'MAINTENANCE'
  );

  // Notify technician if assigned
  if (bTechId) {
    await notificationService.send(
      bTechId,
      'MAINTENANCE_APPROVED',
      `You have been assigned as technician for maintenance request on asset "${request.asset.name}"`,
      bRequestId,
      'MAINTENANCE'
    );
  }

  broadcastDashboardRefresh();

  return updatedRequest;
=======
    const msg = `Your maintenance request for asset ID ${request.assetId} has been approved. Status: ${targetStatus}.`;
    await notificationService.send(request.raisedById, 'MAINTENANCE_APPROVED', msg, requestId, 'MAINTENANCE');

    if (techId) {
      const techMsg = `You have been assigned to a maintenance request (ID: ${requestId}) for asset ID ${request.assetId}.`;
      await notificationService.send(techId, 'MAINTENANCE_RAISED', techMsg, requestId, 'MAINTENANCE');
    }

    await tx.activityLog.create({
      data: {
        actorId: BigInt(actor.id),
        action: 'APPROVED_MAINTENANCE',
        entity: 'MAINTENANCE_REQUEST',
        entityId: BigInt(requestId),
        metadata: { assetId: request.assetId.toString(), status: targetStatus, technicianId: techId?.toString() }
      }
    });

    broadcastDashboardRefresh();
    return updatedRequest;
  });
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
}

/**
 * Resolve a maintenance request and return asset to Available.
 */
async function resolve(requestId, resolution, actor) {
<<<<<<< HEAD
  const bRequestId = BigInt(requestId);
  const bActorId = BigInt(actor.id);

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: bRequestId },
    include: { asset: true }
  });

  if (!request) {
    throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
  }

  const allowedStatuses = ['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'];
  if (!allowedStatuses.includes(request.status)) {
    throw Object.assign(new Error(`Cannot resolve request in status: ${request.status}`), { status: 400 });
  }

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: bRequestId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution: resolution || 'Resolved'
=======
  return await prisma.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({
      where: { id: BigInt(requestId) }
    });

    if (!request) {
      throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
    }

    const validStates = ['IN_PROGRESS', 'TECHNICIAN_ASSIGNED', 'APPROVED'];
    if (!validStates.includes(request.status)) {
      throw Object.assign(new Error(`Cannot resolve request in status: ${request.status}`), { status: 400 });
    }

    const updatedRequest = await tx.maintenanceRequest.update({
      where: { id: BigInt(requestId) },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution: resolution || null
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
      }
    });

    await tx.asset.update({
      where: { id: request.assetId },
      data: { status: 'AVAILABLE' }
    });

<<<<<<< HEAD
    await tx.activityLog.create({
      data: {
        actorId: bActorId,
        action: 'RESOLVED_MAINTENANCE',
        entity: 'MAINTENANCE_REQUEST',
        entityId: bRequestId,
        metadata: { resolution }
      }
    });

    return updated;
  });

  // Notify requester
  await notificationService.send(
    request.raisedById,
    'MAINTENANCE_RESOLVED',
    `Your maintenance request for asset "${request.asset.name}" has been resolved.`,
    bRequestId,
    'MAINTENANCE'
  );

  broadcastDashboardRefresh();

  return updatedRequest;
=======
    const msg = `Your maintenance request for asset ID ${request.assetId} has been resolved. Notes: ${resolution || 'None'}`;
    await notificationService.send(request.raisedById, 'MAINTENANCE_RESOLVED', msg, requestId, 'MAINTENANCE');

    await tx.activityLog.create({
      data: {
        actorId: BigInt(actor.id),
        action: 'RESOLVED_MAINTENANCE',
        entity: 'MAINTENANCE_REQUEST',
        entityId: BigInt(requestId),
        metadata: { assetId: request.assetId.toString(), resolution }
      }
    });

    broadcastDashboardRefresh();
    return updatedRequest;
  });
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
}

module.exports = { approve, resolve };
