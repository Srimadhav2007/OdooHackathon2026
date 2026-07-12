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

// GET /api/maintenance
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, assetId } = req.query;
    const bActorId = BigInt(req.user.id);

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

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, tag: true } },
        raisedBy: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests.map(mapMaintenanceRow));
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

    const asset = await prisma.asset.findUnique({
      where: { id: BigInt(assetId) },
      select: { id: true, status: true }
    });

    if (!asset) return res.status(400).json({ error: 'Asset not found' });

    const allowedStatuses = ['ALLOCATED', 'AVAILABLE'];
    if (!allowedStatuses.includes(asset.status)) {
      return res.status(400).json({ error: `Asset is currently in status: ${asset.status}. Must be AVAILABLE or ALLOCATED.` });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const request = await prisma.$transaction(async (tx) => {
      const r = await tx.maintenanceRequest.create({
        data: {
          assetId: BigInt(assetId),
          raisedById: bActorId,
          priority,
          status: 'PENDING',
          description: description.trim(),
          photoUrl
        }
      });

      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'RAISED_MAINTENANCE',
          entity: 'MAINTENANCE_REQUEST',
          entityId: r.id,
          metadata: { assetId, priority }
        }
      });

      return r;
    });

    const managers = await prisma.employee.findMany({
      where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] }, status: true },
      select: { id: true }
    });

    const managerIds = managers.map(m => m.id);
    const msg = `New maintenance request raised for asset ID ${assetId} (Priority: ${priority}).`;
    await notificationService.sendToMany(managerIds, 'MAINTENANCE_RAISED', msg, request.id, 'MAINTENANCE');

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
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
    const id = BigInt(req.params.id);
    const { reason } = req.body;
    const bRequestId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);

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
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/start
router.put('/:id/start', authenticate, async (req, res, next) => {
  try {
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
