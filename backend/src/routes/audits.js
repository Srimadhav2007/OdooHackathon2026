/**
 * routes/audits.js — Audit Cycle management
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireDeptHead } = require('../middleware/roleGuard');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

const prisma = new PrismaClient();

// POST /api/audits
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, scopeType, scopeValue, startDate, endDate } = req.body;
    const bActorId = BigInt(req.user.id);

    if (!name || !scopeType || !scopeValue || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, scopeType, scopeValue, startDate, and endDate are required' });
    }

    if (scopeType !== 'DEPARTMENT' && scopeType !== 'LOCATION') {
      return res.status(400).json({ error: 'scopeType must be either DEPARTMENT or LOCATION' });
    }

    const cycle = await prisma.$transaction(async (tx) => {
      const c = await tx.auditCycle.create({
        data: {
          name,
          scopeType,
          scopeValue,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'OPEN'
        }
      });

      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'CREATED_AUDIT_CYCLE',
          entity: 'AUDIT_CYCLE',
          entityId: c.id,
          metadata: { name }
        }
      });

      return c;
    });

    res.status(201).json(cycle);
  } catch (err) {
    next(err);
  }
});

// GET /api/audits
router.get('/', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const cycles = await prisma.auditCycle.findMany({
      include: {
        _count: {
          select: { results: true, assignments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cycles);
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);
    const cycle = await prisma.auditCycle.findUnique({
      where: { id: bId },
      include: {
        assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } },
        results: { include: { asset: { select: { tag: true, name: true } }, auditor: { select: { name: true } } } }
      }
    });

    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });
    res.json(cycle);
  } catch (err) {
    next(err);
  }
});

// POST /api/audits/:id/assign
router.post('/:id/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);
    const { auditorIds } = req.body; // array of numbers/strings

    if (!auditorIds || !Array.isArray(auditorIds)) {
      return res.status(400).json({ error: 'auditorIds must be an array' });
    }

    const cycle = await prisma.auditCycle.findUnique({ where: { id: bId } });
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });

    const assignments = await prisma.$transaction(async (tx) => {
      const list = [];
      for (const audId of auditorIds) {
        const bAudId = BigInt(audId);
        
        // Check if already assigned
        const exist = await tx.auditAssignment.findFirst({
          where: { cycleId: bId, auditorId: bAudId }
        });

        if (!exist) {
          const ass = await tx.auditAssignment.create({
            data: { cycleId: bId, auditorId: bAudId }
          });
          list.push(ass);

          // Notify auditor
          await notificationService.send(
            bAudId,
            'AUDIT_ASSIGNED',
            `You have been assigned as auditor for cycle: ${cycle.name}`,
            bId,
            'AUDIT'
          );
        }
      }
      return list;
    });

    res.status(201).json(assignments);
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id/assets — assets in scope for this cycle
router.get('/:id/assets', authenticate, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);

    const cycle = await prisma.auditCycle.findUnique({ where: { id: bId } });
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });

    let scopeWhere = {};
    if (cycle.scopeType === 'DEPARTMENT') {
      const bDeptId = BigInt(cycle.scopeValue);
      scopeWhere = {
        OR: [
          { allocations: { some: { departmentId: bDeptId, status: 'ACTIVE' } } },
          { allocations: { some: { employee: { departmentId: bDeptId }, status: 'ACTIVE' } } }
        ]
      };
    } else if (cycle.scopeType === 'LOCATION') {
      scopeWhere = {
        location: { contains: cycle.scopeValue, mode: 'insensitive' }
      };
    }

    const assets = await prisma.asset.findMany({
      where: scopeWhere,
      include: {
        auditResults: {
          where: { cycleId: bId },
          include: { auditor: { select: { name: true } } },
          take: 1
        }
      }
    });

    res.json(assets);
  } catch (err) {
    next(err);
  }
});

// PUT /api/audits/:id/results — bulk submit verdicts
router.put('/:id/results', authenticate, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);
    const { results } = req.body; // array of { assetId, verdict, notes }

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: 'results must be an array' });
    }

    const cycle = await prisma.auditCycle.findUnique({ where: { id: bId } });
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });
    if (cycle.status === 'CLOSED') return res.status(400).json({ error: 'Cannot submit results to a CLOSED cycle' });

    // Verify actor is assigned auditor for this cycle
    const isAssigned = await prisma.auditAssignment.findFirst({
      where: { cycleId: bId, auditorId: bActorId }
    });
    if (!isAssigned && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not assigned as an auditor for this cycle' });
    }

    await prisma.$transaction(async (tx) => {
      // Upsert results
      for (const resItem of results) {
        const { assetId, verdict, notes } = resItem;
        if (!assetId || !verdict) continue;

        const bAssetId = BigInt(assetId);

        // Find existing result
        const existing = await tx.auditResult.findFirst({
          where: { cycleId: bId, assetId: bAssetId }
        });

        if (existing) {
          await tx.auditResult.update({
            where: { id: existing.id },
            data: { verdict, notes: notes || null, auditorId: bActorId }
          });
        } else {
          await tx.auditResult.create({
            data: {
              cycleId: bId,
              assetId: bAssetId,
              auditorId: bActorId,
              verdict,
              notes: notes || null
            }
          });
        }
      }

      // Update cycle to IN_PROGRESS if OPEN
      if (cycle.status === 'OPEN') {
        await tx.auditCycle.update({
          where: { id: bId },
          data: { status: 'IN_PROGRESS' }
        });
      }
    });

    res.json({ message: 'Audit results submitted successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id/discrepancies
router.get('/:id/discrepancies', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);

    const cycle = await prisma.auditCycle.findUnique({ where: { id: bId } });
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });

    const results = await prisma.auditResult.findMany({
      where: {
        cycleId: bId,
        verdict: { in: ['MISSING', 'DAMAGED'] }
      },
      include: {
        asset: true,
        auditor: { select: { name: true, email: true } }
      }
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// PUT /api/audits/:id/close
router.put('/:id/close', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await auditService.closeCycle(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
