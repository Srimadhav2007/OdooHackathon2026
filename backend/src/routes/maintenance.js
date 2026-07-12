/**
 * routes/maintenance.js — Maintenance Request workflow
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');
const maintenanceService = require('../services/maintenanceService');
const notificationService = require('../services/notificationService');

const prisma = new PrismaClient();

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (_req, file, cb) => cb(null, `maint-${Date.now()}-${file.originalname}`),
  }),
});

<<<<<<< HEAD
=======
// Helper to map DB row
function mapMaintenanceRow(m) {
  return {
    id: m.id,
    assetId: m.assetId,
    raisedById: m.raisedById,
    priority: m.priority,
    status: m.status,
    description: m.description,
    photoUrl: m.photoUrl,
    approvedById: m.approvedById,
    technicianId: m.technicianId,
    resolvedAt: m.resolvedAt,
    resolution: m.resolution,
    createdAt: m.createdAt,
    asset: m.asset ? { id: m.asset.id, name: m.asset.name, tag: m.asset.tag } : null,
    raisedBy: m.raisedBy ? { id: m.raisedBy.id, name: m.raisedBy.name } : null,
    technician: m.technician ? { id: m.technician.id, name: m.technician.name } : null
  };
}

>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
// GET /api/maintenance
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, assetId } = req.query;
    const bActorId = BigInt(req.user.id);

<<<<<<< HEAD
    let baseFilter = {};
    if (req.user.role === 'EMPLOYEE') {
      baseFilter = {
        OR: [
          { raisedById: bActorId },
          { technicianId: bActorId }
        ]
      };
    } else if (req.user.role === 'DEPT_HEAD') {
      if (req.user.departmentId) {
        const bDeptId = BigInt(req.user.departmentId);
        baseFilter = {
          raisedBy: { departmentId: bDeptId }
        };
      } else {
        baseFilter = { raisedById: bActorId };
      }
    }

    const where = {
      ...baseFilter,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assetId && { assetId: BigInt(assetId) }),
    };
=======
    const where = {};

    if (actor.role === 'EMPLOYEE') {
      where.OR = [
        { raisedById: BigInt(actor.id) },
        { technicianId: BigInt(actor.id) }
      ];
    } else if (actor.role === 'DEPT_HEAD') {
      const depts = await prisma.department.findMany({
        where: { headId: BigInt(actor.id) },
        select: { id: true }
      });
      if (depts.length > 0) {
        where.OR = [
          { raisedBy: { departmentId: { in: depts.map(d => d.id) } } },
          { raisedById: BigInt(actor.id) },
          { technicianId: BigInt(actor.id) }
        ];
      } else {
        where.OR = [
          { raisedById: BigInt(actor.id) },
          { technicianId: BigInt(actor.id) }
        ];
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assetId) where.assetId = BigInt(assetId);
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
<<<<<<< HEAD
        asset: { select: { id: true, tag: true, name: true } },
        raisedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
=======
        asset: { select: { id: true, name: true, tag: true } },
        raisedBy: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests.map(mapMaintenanceRow));
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance
router.post('/', authenticate, upload.single('photo'), async (req, res, next) => {
  try {
    const { assetId, priority, description } = req.body;
    const bActorId = BigInt(req.user.id);

    if (!assetId || !priority || !description) {
      return res.status(400).json({ error: 'Asset ID, priority, and description are required' });
    }

<<<<<<< HEAD
    const bAssetId = BigInt(assetId);

    const asset = await prisma.asset.findUnique({ where: { id: bAssetId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const invalidStatuses = ['UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
    if (invalidStatuses.includes(asset.status)) {
      return res.status(400).json({ error: `Cannot request maintenance for asset in status: ${asset.status}` });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
=======
    const asset = await prisma.asset.findUnique({
      where: { id: BigInt(assetId) },
      select: { id: true, status: true }
    });

    if (!asset) return res.status(400).json({ error: 'Asset not found' });

    const allowedStatuses = ['ALLOCATED', 'AVAILABLE'];
    if (!allowedStatuses.includes(asset.status)) {
      return res.status(400).json({ error: `Asset is currently in status: ${asset.status}. Must be AVAILABLE or ALLOCATED.` });
    }
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a

    const request = await prisma.$transaction(async (tx) => {
      const r = await tx.maintenanceRequest.create({
        data: {
          assetId: bAssetId,
          raisedById: bActorId,
          priority,
          status: 'PENDING',
          description,
          photoUrl
        }
      });

<<<<<<< HEAD
      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'RAISED_MAINTENANCE',
          entity: 'MAINTENANCE_REQUEST',
          entityId: r.id,
          metadata: { assetId: bAssetId.toString() }
        }
      });

      return r;
    });

    // Notify Asset Managers / Admins
=======
    const request = await prisma.$transaction(async (tx) => {
      const reqCreated = await tx.maintenanceRequest.create({
        data: {
          assetId: BigInt(assetId),
          raisedById: BigInt(actor.id),
          priority: prio,
          status: 'PENDING',
          description: description.trim(),
          photoUrl: photoPath
        }
      });

      await tx.activityLog.create({
        data: {
          actorId: BigInt(actor.id),
          action: 'RAISED_MAINTENANCE',
          entity: 'MAINTENANCE_REQUEST',
          entityId: reqCreated.id,
          metadata: { assetId, priority: prio }
        }
      });

      return reqCreated;
    });

>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
    const managers = await prisma.employee.findMany({
      where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] }, status: true },
      select: { id: true }
    });
<<<<<<< HEAD
    const managerIds = managers.map(m => m.id);
    const msg = `New maintenance request raised for asset "${asset.name}" (${asset.tag}).`;
=======

    const managerIds = managers.map(m => m.id);
    const msg = `New maintenance request raised for asset ID ${assetId} (Priority: ${prio}).`;
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
    await notificationService.sendToMany(managerIds, 'MAINTENANCE_RAISED', msg, request.id, 'MAINTENANCE');

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        asset: true,
        raisedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    if (!request) return res.status(404).json({ error: 'Maintenance request not found' });

    // Security: employee can only view their own or assigned requests
    if (req.user.role === 'EMPLOYEE' && request.raisedById !== BigInt(req.user.id) && request.technicianId !== BigInt(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(request);
=======
    const id = BigInt(req.params.id);

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, tag: true } },
        raisedBy: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    res.json(mapMaintenanceRow(request));
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/approve
router.put('/:id/approve', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const { technicianId } = req.body;
    const result = await maintenanceService.approve(req.params.id, technicianId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/reject
router.put('/:id/reject', authenticate, requireAssetManager, async (req, res, next) => {
  try {
<<<<<<< HEAD
=======
    const id = BigInt(req.params.id);
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
    const { reason } = req.body;
    const bRequestId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);

<<<<<<< HEAD
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: bRequestId },
      include: { asset: true }
    });

    if (!request) return res.status(404).json({ error: 'Maintenance request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Only PENDING requests can be rejected' });

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.maintenanceRequest.update({
        where: { id: bRequestId },
        data: {
          status: 'REJECTED',
          approvedById: bActorId,
          resolution: reason || 'Rejected'
        }
      });

      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'REJECTED_MAINTENANCE',
          entity: 'MAINTENANCE_REQUEST',
          entityId: bRequestId,
          metadata: { reason }
        }
      });

      return r;
    });

    // Notify requester
    await notificationService.send(
      request.raisedById,
      'MAINTENANCE_REJECTED',
      `Your maintenance request for asset "${request.asset.name}" has been rejected. Reason: ${reason || 'None provided'}`,
      bRequestId,
      'MAINTENANCE'
    );

    res.json(updated);
=======
    const request = await prisma.$transaction(async (tx) => {
      const reqCheck = await tx.maintenanceRequest.findUnique({ where: { id } });
      if (!reqCheck) throw Object.assign(new Error('Maintenance request not found'), { status: 404 });
      if (reqCheck.status !== 'PENDING') throw Object.assign(new Error(`Request cannot be rejected from status: ${reqCheck.status}`), { status: 400 });

      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: { status: 'REJECTED' }
      });

      return updated;
    });

    const msg = `Your maintenance request for asset ID ${request.assetId} has been rejected. Reason: ${reason || 'None'}`;
    await notificationService.send(request.raisedById, 'MAINTENANCE_REJECTED', msg, id, 'MAINTENANCE');

    res.json(request);
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/start
router.put('/:id/start', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const bRequestId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);

    const request = await prisma.maintenanceRequest.findUnique({ where: { id: bRequestId } });
    if (!request) return res.status(404).json({ error: 'Maintenance request not found' });

    // Verify it is assigned to this technician or user is manager/admin
    const isTech = request.technicianId === bActorId;
    const isManager = req.user.role === 'ADMIN' || req.user.role === 'ASSET_MANAGER';
    if (!isTech && !isManager) {
      return res.status(403).json({ error: 'Access denied. You are not the assigned technician.' });
    }

    if (request.status !== 'TECHNICIAN_ASSIGNED' && request.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Cannot start maintenance from this state' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.maintenanceRequest.update({
        where: { id: bRequestId },
        data: { status: 'IN_PROGRESS' }
      });

      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'STARTED_MAINTENANCE',
          entity: 'MAINTENANCE_REQUEST',
          entityId: bRequestId
        }
      });

      return r;
    });

    res.json(updated);
=======
    const id = BigInt(req.params.id);
    const actor = req.user;

    const request = await prisma.$transaction(async (tx) => {
      const reqCheck = await tx.maintenanceRequest.findUnique({ where: { id } });
      if (!reqCheck) throw Object.assign(new Error('Maintenance request not found'), { status: 404 });

      const isTech = reqCheck.technicianId && reqCheck.technicianId.toString() === actor.id.toString();
      const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
      if (!isTech && !isManager) {
        throw Object.assign(new Error('Access denied. You are not the assigned technician.'), { status: 403 });
      }

      const validStates = ['TECHNICIAN_ASSIGNED', 'APPROVED'];
      if (!validStates.includes(reqCheck.status)) {
        throw Object.assign(new Error(`Cannot start request in status: ${reqCheck.status}`), { status: 400 });
      }

      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: { status: 'IN_PROGRESS' }
      });

      return updated;
    });

    res.json(request);
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/resolve
router.put('/:id/resolve', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const { resolution } = req.body;
    const result = await maintenanceService.resolve(req.params.id, resolution, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
