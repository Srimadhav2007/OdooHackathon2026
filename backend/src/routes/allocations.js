/**
 * routes/allocations.js — Asset Allocation & Transfer workflow
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
    const bActorId = BigInt(req.user.id);
    
    // Role-based filtering
    let baseFilter = {};
    if (req.user.role === 'EMPLOYEE') {
      baseFilter.employeeId = bActorId;
    } else if (req.user.role === 'DEPT_HEAD') {
      if (req.user.departmentId) {
        const bDeptId = BigInt(req.user.departmentId);
        // DeptHead sees allocations directly to their department OR to employees in their department
        baseFilter = {
          OR: [
            { departmentId: bDeptId },
            { employee: { departmentId: bDeptId } }
          ]
        };
      } else {
        baseFilter.employeeId = bActorId;
      }
    }

    const where = {
      ...baseFilter,
      ...(status && { status }),
      ...(assetId && { assetId: BigInt(assetId) }),
      ...(employeeId && req.user.role !== 'EMPLOYEE' && { employeeId: BigInt(employeeId) }),
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
      where: { id: BigInt(req.params.id) },
      include: {
        asset: true,
        employee: { select: { id: true, name: true, email: true } },
        department: true,
        transferRequest: { include: { requestedBy: { select: { name: true } }, approvedBy: { select: { name: true } } } },
      },
    });

    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    
    // Security check: employees can only view their own allocations
    if (req.user.role === 'EMPLOYEE' && allocation.employeeId !== BigInt(req.user.id)) {
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
    const result = await allocationService.returnAsset(BigInt(req.params.id), req.body.conditionNotes, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations/:id/transfer-request
router.post('/:id/transfer-request', authenticate, async (req, res, next) => {
  try {
    const { targetEmployeeId, targetDeptId, reason } = req.body;
    const allocationId = BigInt(req.params.id);
    const bActorId = BigInt(req.user.id);

    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    if (allocation.status !== 'ACTIVE') return res.status(400).json({ error: 'Only ACTIVE allocations can be transferred' });
    
    // Ensure the requester is the current holder or an authorized manager/admin
    const isHolder = allocation.employeeId && allocation.employeeId === bActorId;
    const isManager = req.user.role === 'ADMIN' || req.user.role === 'ASSET_MANAGER';
    
    let isAuthorized = isHolder || isManager;
    if (!isAuthorized && req.user.role === 'DEPT_HEAD' && allocation.departmentId) {
      // Check if actor is the head of the holding department
      const deptCheck = await prisma.department.findFirst({
        where: { id: allocation.departmentId, headId: bActorId }
      });
      if (deptCheck) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied. You do not hold or manage this allocation.' });
    }

    if (!targetEmployeeId && !targetDeptId) {
      return res.status(400).json({ error: 'Target Employee or Target Department is required' });
    }

    const transferRequest = await prisma.$transaction(async (tx) => {
      // 1. Create transfer request
      const request = await tx.transferRequest.create({
        data: {
          allocationId,
          requestedById: bActorId,
          targetEmployeeId: targetEmployeeId ? BigInt(targetEmployeeId) : null,
          targetDeptId: targetDeptId ? BigInt(targetDeptId) : null,
          reason: reason || null,
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

    // Notify Asset Managers / Admins
    const managers = await prisma.employee.findMany({
      where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] }, status: true },
      select: { id: true }
    });
    const managerIds = managers.map(m => m.id);

    const asset = await prisma.asset.findUnique({ where: { id: allocation.assetId } });
    const msg = `Transfer requested for asset "${asset?.name || 'Asset'}" by ${req.user.name}.`;
    await notificationService.sendToMany(managerIds, 'TRANSFER_REQUESTED', msg, transferRequest.id, 'TRANSFER');

    res.status(201).json(transferRequest);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A transfer request already exists for this allocation' });
    next(err);
  }
});

// GET /api/allocations/transfers/pending
router.get('/transfers/pending', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const bActorId = BigInt(req.user.id);
    let baseFilter = {};

    if (req.user.role === 'DEPT_HEAD') {
      if (req.user.departmentId) {
        const bDeptId = BigInt(req.user.departmentId);
        // Dept head only sees requests involving their managed department
        baseFilter = {
          OR: [
            { targetDeptId: bDeptId },
            { allocation: { departmentId: bDeptId } },
            { requestedBy: { departmentId: bDeptId } }
          ]
        };
      } else {
        baseFilter = {
          OR: [
            { requestedById: bActorId },
            { targetEmployeeId: bActorId }
          ]
        };
      }
    }

    const transfers = await prisma.transferRequest.findMany({
      where: {
        status: 'PENDING',
        ...baseFilter
      },
      include: {
        allocation: { include: { asset: { select: { id: true, tag: true, name: true } } } },
        requestedBy: { select: { id: true, name: true } },
        targetEmployee: { select: { id: true, name: true } },
        targetDept: { select: { id: true, name: true } },
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
    const bActorId = BigInt(req.user.id);
    const bTid = BigInt(req.params.tid);

    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: bTid },
      include: { allocation: true },
    });

    if (!transferRequest) return res.status(404).json({ error: 'Transfer request not found' });
    if (transferRequest.status !== 'PENDING') return res.status(400).json({ error: 'Request is already processed' });

    const newAllocation = await prisma.$transaction(async (tx) => {
      // 1. Mark transfer request APPROVED
      await tx.transferRequest.update({
        where: { id: bTid },
        data: { status: 'APPROVED', approvedById: bActorId },
      });

      // 2. Mark old allocation as TRANSFERRED
      await tx.allocation.update({
        where: { id: transferRequest.allocationId },
        data: { status: 'TRANSFERRED', actualReturn: new Date() },
      });

      // 3. Create new allocation
      const newAlloc = await tx.allocation.create({
        data: {
          assetId: transferRequest.allocation.assetId,
          employeeId: transferRequest.targetEmployeeId,
          departmentId: transferRequest.targetDeptId,
          status: 'ACTIVE',
        },
      });
      
      // 4. Log action
      await tx.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'APPROVED_TRANSFER',
          entity: 'TRANSFER_REQUEST',
          entityId: bTid,
        },
      });

      return newAlloc;
    });

    const asset = await prisma.asset.findUnique({ where: { id: transferRequest.allocation.assetId } });
    const assetName = asset?.name || 'Asset';

    // Notify requester (approval)
    const requesterMsg = `Your transfer request for asset "${assetName}" has been approved.`;
    await notificationService.send(transferRequest.requestedById, 'TRANSFER_APPROVED', requesterMsg, bTid, 'TRANSFER');

    // Notify target employee if applicable
    if (transferRequest.targetEmployeeId) {
      const targetMsg = `Asset "${assetName}" has been transferred to you.`;
      await notificationService.send(transferRequest.targetEmployeeId, 'ASSET_ASSIGNED', targetMsg, newAllocation.id, 'ALLOCATION');
    }

    res.json({ message: 'Transfer approved successfully', newAllocation });
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/transfers/:tid/reject
router.put('/transfers/:tid/reject', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const bActorId = BigInt(req.user.id);
    const bTid = BigInt(req.params.tid);

    const transferRequest = await prisma.transferRequest.findUnique({
      where: { id: bTid },
      include: { allocation: true },
    });

    if (!transferRequest) return res.status(404).json({ error: 'Transfer request not found' });
    if (transferRequest.status !== 'PENDING') return res.status(400).json({ error: 'Request is already processed' });

    await prisma.$transaction([
      prisma.transferRequest.update({
        where: { id: bTid },
        data: { status: 'REJECTED', approvedById: bActorId }, 
      }),
      prisma.allocation.update({
        where: { id: transferRequest.allocationId },
        data: { status: 'ACTIVE' }, 
      }),
      prisma.activityLog.create({
        data: {
          actorId: bActorId,
          action: 'REJECTED_TRANSFER',
          entity: 'TRANSFER_REQUEST',
          entityId: bTid,
        },
      }),
    ]);

    const asset = await prisma.asset.findUnique({ where: { id: transferRequest.allocation.assetId } });
    const assetName = asset?.name || 'Asset';

    const requesterMsg = `Your transfer request for asset "${assetName}" has been rejected.`;
    await notificationService.send(transferRequest.requestedById, 'TRANSFER_REJECTED', requesterMsg, bTid, 'TRANSFER');

    res.json({ message: 'Transfer request rejected successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
