/**
 * routes/reports.js — Analytics & Reports
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireDeptHead } = require('../middleware/roleGuard');
const allocationService = require('../services/allocationService');

const prisma = new PrismaClient();

// Helper to sanitize BigInts for queryRaw
BigInt.prototype.toJSON = function() { return this.toString() };

// GET /api/reports/dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const actor = req.user;
    
    let assetsAvailable = 0;
    let assetsAllocated = 0;
    let maintenanceToday = 0;
    let activeBookings = 0;
    let pendingTransfers = 0;
    let upcomingReturns = 0;
    let overdueReturns = 0;

    if (actor.role === 'DEPT_HEAD') {
      const depts = await prisma.department.findMany({ where: { headId: BigInt(actor.id) }, select: { id: true } });
      
      if (depts.length > 0) {
        const deptIds = depts.map(d => d.id);
        
        // Use Prisma's native counts for simpler queries
        assetsAllocated = await prisma.allocation.count({
          where: { status: 'ACTIVE', departmentId: { in: deptIds } }
        });

        // Complex queries fall back to queryRaw
        const result = await prisma.$queryRaw`
          SELECT 
            (SELECT COUNT(*)::int FROM asset a WHERE a.status = 'AVAILABLE' AND a.location IN (SELECT location FROM asset ast JOIN allocation alloc ON alloc.asset_id = ast.id AND alloc.status = 'ACTIVE' WHERE alloc.department_id = ANY(${deptIds}))) as available,
            (SELECT COUNT(*)::int FROM maintenance_request m JOIN employee req ON m.raised_by_id = req.id WHERE DATE(m.created_at) = CURRENT_DATE AND req.department_id = ANY(${deptIds})) as maint_today,
            (SELECT COUNT(*)::int FROM booking b JOIN employee emp ON b.user_id = emp.id WHERE b.status IN ('UPCOMING', 'ONGOING') AND emp.department_id = ANY(${deptIds})) as active_bookings,
            (SELECT COUNT(*)::int FROM transfer_request tr JOIN allocation a ON tr.allocation_id = a.id WHERE tr.status = 'PENDING' AND (a.department_id = ANY(${deptIds}) OR tr.target_department_id = ANY(${deptIds}))) as pending_transfers,
            (SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND department_id = ANY(${deptIds}) AND expected_return >= CURRENT_DATE AND expected_return <= CURRENT_DATE + INTERVAL '7 days') as upcoming_returns,
            (SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND department_id = ANY(${deptIds}) AND expected_return < CURRENT_DATE) as overdue_returns
        `;
        
        if (result && result.length > 0) {
          assetsAvailable = result[0].available;
          maintenanceToday = result[0].maint_today;
          activeBookings = result[0].active_bookings;
          pendingTransfers = result[0].pending_transfers;
          upcomingReturns = result[0].upcoming_returns;
          overdueReturns = result[0].overdue_returns;
        }
      }
    } else if (actor.role === 'EMPLOYEE') {
      const actorId = BigInt(actor.id);
      assetsAllocated = await prisma.allocation.count({ where: { status: 'ACTIVE', employeeId: actorId } });
      activeBookings = await prisma.booking.count({ where: { userId: actorId, status: { in: ['UPCOMING', 'ONGOING'] } } });
      pendingTransfers = await prisma.transferRequest.count({ where: { requestedById: actorId, status: 'PENDING' } });
      
      const result = await prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*)::int FROM maintenance_request WHERE raised_by_id = ${actorId} AND DATE(created_at) = CURRENT_DATE) as maint_today,
          (SELECT COUNT(*)::int FROM allocation WHERE employee_id = ${actorId} AND status = 'ACTIVE' AND expected_return >= CURRENT_DATE AND expected_return <= CURRENT_DATE + INTERVAL '7 days') as upcoming_returns,
          (SELECT COUNT(*)::int FROM allocation WHERE employee_id = ${actorId} AND status = 'ACTIVE' AND expected_return < CURRENT_DATE) as overdue_returns
      `;
      if (result && result.length > 0) {
        maintenanceToday = result[0].maint_today;
        upcomingReturns = result[0].upcoming_returns;
        overdueReturns = result[0].overdue_returns;
      }
    } else {
      // ADMIN or ASSET_MANAGER
      const result = await prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*)::int FROM asset WHERE status = 'AVAILABLE') as available,
          (SELECT COUNT(*)::int FROM asset WHERE status = 'ALLOCATED') as allocated,
          (SELECT COUNT(*)::int FROM maintenance_request WHERE DATE(created_at) = CURRENT_DATE) as maint_today,
          (SELECT COUNT(*)::int FROM booking WHERE status IN ('UPCOMING', 'ONGOING')) as active_bookings,
          (SELECT COUNT(*)::int FROM transfer_request WHERE status = 'PENDING') as pending_transfers,
          (SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND expected_return >= CURRENT_DATE AND expected_return <= CURRENT_DATE + INTERVAL '7 days') as upcoming_returns,
          (SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND expected_return < CURRENT_DATE) as overdue_returns
      `;
      if (result && result.length > 0) {
        assetsAvailable = result[0].available;
        assetsAllocated = result[0].allocated;
        maintenanceToday = result[0].maint_today;
        activeBookings = result[0].active_bookings;
        pendingTransfers = result[0].pending_transfers;
        upcomingReturns = result[0].upcoming_returns;
        overdueReturns = result[0].overdue_returns;
      }
    }

    res.json({
      assetsAvailable: Number(assetsAvailable),
      assetsAllocated: Number(assetsAllocated),
      maintenanceToday: Number(maintenanceToday),
      activeBookings: Number(activeBookings),
      pendingTransfers: Number(pendingTransfers),
      upcomingReturns: Number(upcomingReturns),
      overdueReturns: Number(overdueReturns)
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/utilization
router.get('/utilization', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date();
    if (!from) start.setDate(end.getDate() - 30); // Default to last 30 days

    const allocations = await prisma.allocation.findMany({
      where: {
        createdAt: { lte: end },
        OR: [
          { status: 'ACTIVE' },
          { status: 'RETURNED' },
          { status: 'TRANSFERRED' }
        ]
      },
      select: { createdAt: true, actualReturn: true }
    });

    const result = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*)::int AS "allocatedCount"
      FROM allocation
      WHERE created_at >= ${start} AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/maintenance
router.get('/maintenance', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        c.name AS category,
        COUNT(*)::int AS count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (m.resolved_at - m.created_at)) / 3600), 0)::double precision AS "avgResolutionHours"
      FROM maintenance_request m
      JOIN asset a ON m.asset_id = a.id
      JOIN asset_category c ON a.category_id = c.id
      WHERE m.status = 'RESOLVED'
      GROUP BY c.name
      ORDER BY count DESC
    `;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/allocations
router.get('/allocations', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        d.name AS department,
        (SELECT COUNT(*)::int FROM allocation a WHERE a.department_id = d.id AND a.status = 'ACTIVE') AS "totalAssets",
        (SELECT COUNT(*)::int FROM employee e WHERE e.department_id = d.id AND e.status = true) AS "totalEmployees"
      FROM department d
      WHERE d.status = true
      ORDER BY d.name ASC
    `;

    const allocations = result.map(r => {
      const totalAssets = Number(r.totalAssets) || 0;
      const totalEmployees = Number(r.totalEmployees) || 0;
      const assetsPerEmployee = totalEmployees > 0 ? (totalAssets / totalEmployees).toFixed(2) : 0;
      return {
        departmentName: r.department,
        totalAssets,
        employeeCount: totalEmployees,
        assetsPerEmployee
      };
    });

    res.json(allocations);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/booking-heatmap
router.get('/booking-heatmap', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM start_time)::int AS weekday,
        EXTRACT(HOUR FROM start_time)::int AS hour,
        COUNT(*)::int AS count
      FROM booking
      WHERE status != 'CANCELLED'
      GROUP BY EXTRACT(DOW FROM start_time), EXTRACT(HOUR FROM start_time)
      ORDER BY weekday, hour
    `;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/overdue
router.get('/overdue', authenticate, async (req, res, next) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.asset_id AS "assetId",
        a.employee_id AS "employeeId",
        a.department_id AS "departmentId",
        a.status,
        a.expected_return AS "expectedReturn",
        ast.name AS "assetName",
        ast.tag AS "assetTag",
        emp.name AS "employeeName",
        dept.name AS "departmentName"
      FROM allocation a
      JOIN asset ast ON a.asset_id = ast.id
      LEFT JOIN employee emp ON a.employee_id = emp.id
      LEFT JOIN department dept ON a.department_id = dept.id
      WHERE a.status = 'ACTIVE' AND a.expected_return < CURRENT_DATE
      ORDER BY a.expected_return ASC
    `;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/export/:type
router.get('/export/:type', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const type = req.params.type;
    let csvContent = '';

    if (type === 'assets') {
      filename = 'assets_report.csv';
      const result = await prisma.$queryRaw`SELECT tag, name, status, condition, location, acquisition_date FROM asset ORDER BY tag ASC`;
      csvData = 'Tag,Name,Status,Condition,Location,Acquisition Date\n';
      result.forEach(r => {
        csvData += `"${r.tag}","${r.name}","${r.status}","${r.condition}","${r.location || ''}","${r.acquisition_date ? new Date(r.acquisition_date).toLocaleDateString() : ''}"\n`;
      });
    } else if (type === 'allocations') {
      filename = 'allocations_report.csv';
      const result = await prisma.$queryRaw`
        SELECT 
          ast.tag AS asset_tag, 
          ast.name AS asset_name, 
          emp.name AS employee_name, 
          dept.name AS department_name, 
          a.status, 
          a.expected_return 
        FROM allocation a 
        JOIN asset ast ON a.asset_id = ast.id 
        LEFT JOIN employee emp ON a.employee_id = emp.id 
        LEFT JOIN department dept ON a.department_id = dept.id
        ORDER BY a.created_at DESC
      `;
      csvData = 'Asset Tag,Asset Name,Employee Name,Department Name,Status,Expected Return\n';
      result.forEach(r => {
        csvData += `"${r.asset_tag}","${r.asset_name}","${r.employee_name || ''}","${r.department_name || ''}","${r.status}","${r.expected_return ? new Date(r.expected_return).toLocaleDateString() : ''}"\n`;
      });
    } else if (type === 'maintenance') {
      filename = 'maintenance_report.csv';
      const result = await prisma.$queryRaw`
        SELECT 
          m.id, 
          ast.tag AS asset_tag, 
          m.priority, 
          m.status, 
          m.description, 
          m.created_at 
        FROM maintenance_request m 
        JOIN asset ast ON m.asset_id = ast.id 
        ORDER BY m.created_at DESC
      `;
      csvData = 'Request ID,Asset Tag,Priority,Status,Description,Created At\n';
      result.forEach(r => {
        csvData += `"${r.id}","${r.asset_tag}","${r.priority}","${r.status}","${r.description.replace(/"/g, '""')}","${new Date(r.created_at).toLocaleString()}"\n`;
      });
    } else {
      return res.status(400).json({ error: 'Invalid export type. Supported: assets, allocations, maintenance' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
