/**
 * routes/audits.js — Audit Cycle management
 *
 * POST /api/audits                      — Create audit cycle (Admin)
 * GET  /api/audits                      — List audit cycles
 * GET  /api/audits/:id                  — Cycle detail + results
 * POST /api/audits/:id/assign           — Assign auditors to cycle (Admin)
 * GET  /api/audits/:id/assets           — List assets in scope for audit
 * PUT  /api/audits/:id/results          — Submit audit verdicts (Auditor)
 * GET  /api/audits/:id/discrepancies    — Discrepancy report (Missing/Damaged)
 * PUT  /api/audits/:id/close            — Close cycle + update asset statuses (Admin)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireDeptHead } = require('../middleware/roleGuard');
const auditService = require('../services/auditService');

// POST /api/audits
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Validate: name, scopeType (DEPARTMENT|LOCATION), scopeValue, startDate, endDate
    //  - Create AuditCycle with status = OPEN
    res.status(201).json({ message: 'TODO: create audit cycle' });
  } catch (err) {
    next(err);
  }
});

// GET /api/audits
router.get('/', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): List cycles with _count of results and assignments
    res.json({ message: 'TODO: list audit cycles' });
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): Cycle detail with auditors, progress summary
    res.json({ message: 'TODO: get audit cycle', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/audits/:id/assign
router.post('/:id/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - req.body.auditorIds: array of employee IDs
    //  - Create AuditAssignment records; notify each auditor
    res.status(201).json({ message: 'TODO: assign auditors', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id/assets — assets in scope for this cycle
router.get('/:id/assets', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Filter assets by cycle's scopeType/scopeValue
    //  - For each asset, include existing AuditResult if submitted
    res.json({ message: 'TODO: get audit assets', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/audits/:id/results — bulk submit verdicts
router.put('/:id/results', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B):
    //  - Verify req.user is assigned auditor for this cycle
    //  - req.body.results: [{ assetId, verdict, notes }]
    //  - Upsert AuditResult records
    //  - Set cycle status = IN_PROGRESS if first submission
    res.json({ message: 'TODO: submit audit results', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id/discrepancies
router.get('/:id/discrepancies', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    // TODO (Member B): Return AuditResults where verdict = MISSING or DAMAGED
    res.json({ message: 'TODO: get discrepancy report', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/audits/:id/close
router.put('/:id/close', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // TODO (Member B): Delegate to auditService.closeCycle()
    //  1. Set cycle.status = CLOSED (irreversible)
    //  2. For MISSING verdicts: set asset.status = LOST
    //  3. For DAMAGED: update asset.condition = DAMAGED
    //  4. Auto-generate discrepancy report (already in DB, just flag cycle as closed)
    //  5. Notify stakeholders
    const result = await auditService.closeCycle(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
