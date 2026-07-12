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

// Helper to map audit cycle row
function mapAuditCycleRow(c) {
  return {
    id: c.id,
    name: c.name,
    scopeType: c.scopeType,
    scopeValue: c.scopeValue,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    createdAt: c.createdAt,
    _count: {
      results: c._count?.results || 0,
      assignments: c._count?.assignments || 0
    }
  };
}

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

    res.json(cycles.map(mapAuditCycleRow));
  } catch (err) {
    next(err);
  }
});

// POST /api/audits
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, scopeType, scopeValue, startDate, endDate } = req.body;

    if (!name || !scopeType || !scopeValue || !startDate || !endDate) {
      return res.status(400).json({ error: 'All fields are required: name, scopeType, scopeValue, startDate, endDate' });
    }

    if (scopeType !== 'DEPARTMENT' && scopeType !== 'LOCATION') {
      return res.status(400).json({ error: 'scopeType must be either DEPARTMENT or LOCATION' });
    }

    if (scopeType === 'DEPARTMENT') {
      const dept = await prisma.department.findUnique({ where: { id: BigInt(scopeValue) } });
      if (!dept) {
        return res.status(400).json({ error: 'Department specified as scope value not found' });
      }
    }

    const cycle = await prisma.auditCycle.create({
      data: {
        name: name.trim(),
        scopeType,
        scopeValue: scopeValue.toString(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'OPEN'
      }
    });

    res.status(201).json(mapAuditCycleRow(cycle));
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);

    const cycle = await prisma.auditCycle.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { auditor: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    if (!cycle) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }

    const results = await prisma.auditResult.groupBy({
      by: ['verdict'],
      where: { cycleId: id },
      _count: true
    });

    const summary = { total: 0, verified: 0, missing: 0, damaged: 0 };
    for (const r of results) {
      summary.total += r._count;
      if (r.verdict === 'VERIFIED') summary.verified = r._count;
      if (r.verdict === 'MISSING') summary.missing = r._count;
      if (r.verdict === 'DAMAGED') summary.damaged = r._count;
    }

    const mapped = mapAuditCycleRow(cycle);
    mapped.assignments = cycle.assignments.map(a => ({
      id: a.id,
      auditorId: a.auditorId,
      auditor_name: a.auditor.name,
      auditor_email: a.auditor.email
    }));
    mapped.summary = summary;

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// POST /api/audits/:id/assign
router.post('/:id/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { auditorIds } = req.body;

    if (!auditorIds || !Array.isArray(auditorIds) || auditorIds.length === 0) {
      return res.status(400).json({ error: 'auditorIds array is required' });
    }

    const cycle = await prisma.auditCycle.findUnique({ where: { id }, select: { name: true } });
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });

    const createdAssignments = await prisma.$transaction(async (tx) => {
      const added = [];
      for (const auditorId of auditorIds) {
        const emp = await tx.employee.findFirst({
          where: { id: BigInt(auditorId), status: true }
        });

        if (!emp) throw Object.assign(new Error(`Active employee with ID ${auditorId} not found`), { status: 400 });

        const existing = await tx.auditAssignment.findFirst({
          where: { cycleId: id, auditorId: BigInt(auditorId) }
        });

        if (!existing) {
          const assignment = await tx.auditAssignment.create({
            data: { cycleId: id, auditorId: BigInt(auditorId) }
          });
          added.push(assignment);

          const msg = `You have been assigned to audit cycle "${cycle.name}".`;
          await notificationService.send(auditorId, 'AUDIT_ASSIGNED', msg, id.toString(), 'AUDIT');
        }
      }
      return added;
    });

    res.status(201).json(createdAssignments);
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id/assets
router.get('/:id/assets', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);

    const cycle = await prisma.auditCycle.findUnique({ where: { id } });
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });

    let assets = [];
    if (cycle.scopeType === 'DEPARTMENT') {
      const deptId = BigInt(cycle.scopeValue);
      assets = await prisma.asset.findMany({
        where: {
          allocations: {
            some: {
              status: 'ACTIVE',
              OR: [
                { departmentId: deptId },
                { employee: { departmentId: deptId } }
              ]
            }
          }
        },
        include: { category: true }
      });
    } else if (cycle.scopeType === 'LOCATION') {
      assets = await prisma.asset.findMany({
        where: { location: { contains: cycle.scopeValue, mode: 'insensitive' } },
        include: { category: true }
      });
    } else {
      return res.status(400).json({ error: 'Unsupported scope type' });
    }

    const results = await prisma.auditResult.findMany({
      where: { cycleId: id },
      include: { auditor: { select: { id: true, name: true } } }
    });

    const assetsWithResults = assets.map(a => {
      const match = results.find(r => r.assetId.toString() === a.id.toString());
      return {
        id: a.id,
        tag: a.tag,
        name: a.name,
        categoryId: a.categoryId,
        serialNumber: a.serialNumber,
        condition: a.condition,
        status: a.status,
        location: a.location,
        category: { id: a.category.id, name: a.category.name },
        auditResult: match ? {
          id: match.id,
          verdict: match.verdict,
          notes: match.notes,
          auditor: { id: match.auditorId, name: match.auditor.name }
        } : null
      };
    });

    res.json(assetsWithResults);
  } catch (err) {
    next(err);
  }
});

// PUT /api/audits/:id/results
router.put('/:id/results', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { results } = req.body;
    const actor = req.user;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'results array is required' });
    }

    const cycle = await prisma.auditCycle.findUnique({ where: { id } });
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });
    if (cycle.status === 'CLOSED') return res.status(400).json({ error: 'Audit cycle is closed. Cannot submit new results.' });

    const assignment = await prisma.auditAssignment.findFirst({
      where: { cycleId: id, auditorId: BigInt(actor.id) }
    });

    if (!assignment && actor.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You are not an assigned auditor for this cycle.' });
    }

    const savedResults = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const item of results) {
        const { assetId, verdict, notes } = item;
        if (!assetId || !verdict) throw Object.assign(new Error('Each result must specify assetId and verdict'), { status: 400 });

        const asset = await tx.asset.findUnique({ where: { id: BigInt(assetId) } });
        if (!asset) throw Object.assign(new Error(`Asset with ID ${assetId} not found`), { status: 400 });

        const existing = await tx.auditResult.findFirst({
          where: { cycleId: id, assetId: BigInt(assetId) }
        });

        let finalRes;
        if (existing) {
          finalRes = await tx.auditResult.update({
            where: { id: existing.id },
            data: { verdict, notes: notes || null, auditorId: BigInt(actor.id) }
          });
        } else {
          finalRes = await tx.auditResult.create({
            data: { cycleId: id, assetId: BigInt(assetId), auditorId: BigInt(actor.id), verdict, notes: notes || null }
          });
        }
        saved.push(finalRes);
      }

      if (cycle.status === 'OPEN') {
        await tx.auditCycle.update({
          where: { id },
          data: { status: 'IN_PROGRESS' }
        });
      }

      return saved;
    });

    res.json(savedResults);
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id/discrepancies
router.get('/:id/discrepancies', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);

    const discrepancies = await prisma.auditResult.findMany({
      where: { cycleId: id, verdict: { in: ['MISSING', 'DAMAGED'] } },
      include: {
        asset: { select: { id: true, name: true, tag: true } },
        auditor: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(discrepancies.map(r => ({
      id: r.id,
      cycleId: r.cycleId,
      assetId: r.assetId,
      auditorId: r.auditorId,
      verdict: r.verdict,
      notes: r.notes,
      createdAt: r.createdAt,
      asset: { id: r.asset.id, name: r.asset.name, tag: r.asset.tag },
      auditor: { id: r.auditor.id, name: r.auditor.name }
    })));
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
