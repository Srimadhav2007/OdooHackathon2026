/**
 * routes/allocations.js — Asset Allocation & Transfer workflow
 *
 * GET  /api/allocations                        — List allocations (role-filtered)
 * POST /api/allocations                        — Allocate asset (conflict-checked)
 * GET  /api/allocations/:id                    — Get allocation detail
 * PUT  /api/allocations/:id/return             — Mark returned + condition notes
 *
 * Transfer workflow:
 * POST /api/allocations/:id/transfer-request   — Employee raises transfer request
 * GET  /api/allocations/transfers              — List pending transfers (manager view)
 * PUT  /api/allocations/transfers/:tid/approve — Approve transfer → re-allocate
 * PUT  /api/allocations/transfers/:tid/reject  — Reject transfer request
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager, requireDeptHead } = require('../middleware/roleGuard');
const allocationService = require('../services/allocationService');
const notificationService = require('../services/notificationService');

const prisma = new PrismaClient();

// GET /api/allocations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, assetId, employeeId, overdue } = req.query;
    
    // Role-based filtering
    let baseFilter = {};
    if (req.user.role === 'EMPLOYEE') {
      baseFilter.employeeId = req.user.id;
    } else if (req.user.role === 'DEPT_HEAD') {
      // Allow fetching for all employees in their department
      const deptEmployees = await prisma.employee.findMany({
        where: { departmentId: req.user.departmentId },
        select: { id: true },
      });
      const empIds = deptEmployees.map(e => e.id);
      baseFilter.employeeId = { in: empIds };
    } // ADMIN and ASSET_MANAGER see all

    const where = {
      ...baseFilter,
      ...(status && { status }),
      ...(assetId && { assetId }),
      ...(employeeId && req.user.role !== 'EMPLOYEE' && { employeeId }), // Allow managers to filter by specific employee
      ...(overdue === 'true' && { status: 'ACTIVE', expectedReturn: { lt: new Date() } }),
    };

    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        asset: { select: { id: true, tag: true, name: true, category: { select: { name: true } } } },
        employee: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(allocations);
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations
router.post('/', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const result = await allocationService.allocate(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/allocations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const allocation = await prisma.allocation.findUnique({
      where: { id: req.params.id },
      include: {
        asset: true,
        employee: { select: { id: true, name: true, email: true } },
        department: true,
        transferRequest: { include: { requestedBy: { select: { name: true } }, approvedBy: { select: { name: true } } } },
      },
    });

    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    
    // Security: employees can only view their own allocations
    if (req.user.role === 'EMPLOYEE' && allocation.employeeId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(allocation);
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/:id/return
router.put('/:id/return', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const result = await allocationService.returnAsset(req.params.id, req.body.conditionNotes, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations/:id/transfer-request
router.post('/:id/transfer-request', authenticate, async (req, res, next) => {
  try {
    const { targetEmployeeId, targetDeptId, reason } = req.body;
    const allocationId = req.params.id;

    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    if (allocation.status !== 'ACTIVE') return res.status(400).json({ error: 'Only ACTIVE allocations can be transferred' });
    
    // Ensure the requester is the current holder (or an admin/manager acting on their behalf)
    if (req.user.role === 'EMPLOYEE' && allocation.employeeId !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this allocation' });
    }

    const transferRequest = await prisma.$transaction(async (tx) => {
      // 1. Create transfer request
      const request = await tx.transferRequest.create({
        data: {
          allocationId,
          requestedById: req.user.id,
          targetEmployeeId: targetEmployeeId || null,
          targetDeptId: targetDeptId || null,
          reason,
          status: 'PENDING',
        },
      });

      // 2. Update allocation status
      await tx.allocation.update({
        where: { id: allocationId },
        data: { status: 'TRANSFER_REQUESTED' },
      });

      return request;
    });

    // Notify Asset Managers and Dept Heads about the new transfer request
    // Note: In a real app, you'd target specific managers (e.g. Dept Head of the user).
    // For the hackathon, emitting a generic event or logging it is often sufficient, 
    // but you can implement specific fetching if desired.
    console.log(`[Transfer] New request ${transferRequest.id} created by ${req.user.name}`);

    res.status(201).json(transferRequest);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A transfer request already exists for this allocation' });
    next(err);
  }
});

// GET /api/allocations/transfers/pending
router.get('/transfers/pending', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const transfers = await prisma.transferRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        allocation: { include: { asset: { select: { tag: true, name: true } } } },
        requestedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transfers);
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/transfers/:tid/approve
router.put('/transfers/:tid/approve', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: req.params.tid },
      include: { allocation: true },
    });

    if (!transferRequest) return res.status(404).json({ error: 'Transfer request not found' });
    if (transferRequest.status !== 'PENDING') return res.status(400).json({ error: 'Request is already processed' });

    await prisma.$transaction(async (tx) => {
      // 1. Mark transfer request APPROVED
      await tx.transferRequest.update({
        where: { id: transferRequest.id },
        data: { status: 'APPROVED', approvedById: req.user.id },
      });

      // 2. Mark old allocation as TRANSFERRED
      await tx.allocation.update({
        where: { id: transferRequest.allocationId },
        data: { status: 'TRANSFERRED', actualReturn: new Date() },
      });

      // 3. Create new allocation
      await tx.allocation.create({
        data: {
          assetId: transferRequest.allocation.assetId,
          employeeId: transferRequest.targetEmployeeId,
          departmentId: transferRequest.targetDeptId,
          status: 'ACTIVE',
        },
      });
      
      // 4. Log it
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          action: 'APPROVED_TRANSFER',
          entity: 'TRANSFER_REQUEST',
          entityId: transferRequest.id,
        },
      });
    });

    // Notify requester
    await notificationService.send(
      transferRequest.requestedById,
      'TRANSFER_APPROVED',
      'Your transfer request has been approved.',
      transferRequest.id,
      'TRANSFER_REQUEST'
    );
    // Notify target employee if applicable
    if (transferRequest.targetEmployeeId) {
      await notificationService.send(
        transferRequest.targetEmployeeId,
        'ASSET_ASSIGNED',
        'An asset has been transferred to you.',
        transferRequest.allocationId,
        'ALLOCATION'
      );
    }

    res.json({ message: 'Transfer approved successfully' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/transfers/:tid/reject
router.put('/transfers/:tid/reject', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: req.params.tid },
      include: { allocation: true },
    });

    if (!transferRequest) return res.status(404).json({ error: 'Transfer request not found' });
    if (transferRequest.status !== 'PENDING') return res.status(400).json({ error: 'Request is already processed' });

    await prisma.$transaction([
      prisma.transferRequest.update({
        where: { id: transferRequest.id },
        data: { status: 'REJECTED', approvedById: req.user.id }, // We reuse approvedById for who processed it
      }),
      prisma.allocation.update({
        where: { id: transferRequest.allocationId },
        data: { status: 'ACTIVE' }, // Revert to active
      }),
      prisma.activityLog.create({
        data: {
          actorId: req.user.id,
          action: 'REJECTED_TRANSFER',
          entity: 'TRANSFER_REQUEST',
          entityId: transferRequest.id,
        },
      }),
    ]);

    await notificationService.send(
      transferRequest.requestedById,
      'TRANSFER_REJECTED',
      'Your transfer request was rejected.',
      transferRequest.id,
      'TRANSFER_REQUEST'
    );

    res.json({ message: 'Transfer rejected successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
