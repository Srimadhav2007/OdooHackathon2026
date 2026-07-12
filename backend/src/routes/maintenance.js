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

// GET /api/maintenance
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, assetId } = req.query;
    const bActorId = BigInt(req.user.id);

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

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: { select: { id: true, tag: true, name: true } },
        raisedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
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

    const bAssetId = BigInt(assetId);

    const asset = await prisma.asset.findUnique({ where: { id: bAssetId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const invalidStatuses = ['UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
    if (invalidStatuses.includes(asset.status)) {
      return res.status(400).json({ error: `Cannot request maintenance for asset in status: ${asset.status}` });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

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
    const managers = await prisma.employee.findMany({
      where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] }, status: true },
      select: { id: true }
    });
    const managerIds = managers.map(m => m.id);
    const msg = `New maintenance request raised for asset "${asset.name}" (${asset.tag}).`;
    await notificationService.sendToMany(managerIds, 'MAINTENANCE_RAISED', msg, request.id, 'MAINTENANCE');

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
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
    const { reason } = req.body;
    const bRequestId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);

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
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/start
router.put('/:id/start', authenticate, async (req, res, next) => {
  try {
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
