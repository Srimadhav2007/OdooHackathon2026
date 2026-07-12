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
const { authenticate } = require('../middleware/auth');
const { requireAssetManager, requireDeptHead } = require('../middleware/roleGuard');
const allocationService = require('../services/allocationService');

// GET /api/allocations
router.get('/', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Admin/AssetManager: all allocations
    //  - DeptHead: department's allocations
    //  - Employee: own allocations
    //  - Filters: ?status=, ?assetId=, ?employeeId=, ?overdue=true
    res.json({ message: 'TODO: list allocations' });
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations
router.post('/', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    // TODO (Member B): Delegate to allocationService.allocate()
    //  - Returns 409 with { error, currentHolder } if conflict
    //  - On success: update asset.status = ALLOCATED, create Notification, log ActivityLog
    const result = await allocationService.allocate(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/allocations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    res.json({ message: 'TODO: get allocation', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/:id/return
router.put('/:id/return', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Set allocation.status = RETURNED, actualReturn = now
    //  2. Save conditionNotes from req.body
    //  3. Set asset.status = AVAILABLE
    //  4. Notify original employee, log action
    res.json({ message: 'TODO: return allocation', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations/:id/transfer-request
router.post('/:id/transfer-request', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Verify req.user is the current holder (or manager)
    //  2. Create TransferRequest (status = PENDING)
    //  3. Set allocation.status = TRANSFER_REQUESTED
    //  4. Notify Asset Manager/Dept Head
    res.status(201).json({ message: 'TODO: raise transfer request', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/allocations/transfers — pending transfers list
router.get('/transfers/pending', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): Return pending TransferRequests for manager's scope
    res.json({ message: 'TODO: list transfer requests' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/transfers/:tid/approve
router.put('/transfers/:tid/approve', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Set TransferRequest.status = APPROVED, approvedById = req.user.id
    //  2. Close old Allocation, create new Allocation for target employee/dept
    //  3. Update asset.status remains ALLOCATED
    //  4. Notify requester, new holder; log action
    res.json({ message: 'TODO: approve transfer', tid: req.params.tid });
  } catch (err) {
    next(err);
  }
});

// PUT /api/allocations/transfers/:tid/reject
router.put('/transfers/:tid/reject', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  1. Set TransferRequest.status = REJECTED
    //  2. Revert allocation.status = ACTIVE
    //  3. Notify requester
    res.json({ message: 'TODO: reject transfer', tid: req.params.tid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
