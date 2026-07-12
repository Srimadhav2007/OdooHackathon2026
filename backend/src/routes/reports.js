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

const prisma = new PrismaClient();

// Helper to sanitize BigInts for queryRaw
BigInt.prototype.toJSON = function() { return this.toString() };

// GET /api/reports/dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const role = req.user.role;
    const bActorId = BigInt(req.user.id);
    const bDeptId = req.user.departmentId ? BigInt(req.user.departmentId) : null;

    let assetFilter = {};
    let allocFilter = {};
    let maintFilter = {};
    let bookingFilter = {};
    let transferFilter = {};

    if (role === 'EMPLOYEE') {
      assetFilter = { allocations: { some: { employeeId: bActorId, status: 'ACTIVE' } } };
      allocFilter = { employeeId: bActorId };
      maintFilter = { raisedById: bActorId };
      bookingFilter = { userId: bActorId };
      transferFilter = { OR: [{ requestedById: bActorId }, { targetEmployeeId: bActorId }] };
    } else if (role === 'DEPT_HEAD') {
      if (bDeptId) {
        assetFilter = {
          allocations: {
            some: {
              OR: [
                { departmentId: bDeptId },
                { employee: { departmentId: bDeptId } }
              ],
              status: 'ACTIVE'
            }
          }
        };
        allocFilter = {
          OR: [
            { departmentId: bDeptId },
            { employee: { departmentId: bDeptId } }
          ]
        };
        maintFilter = { raisedBy: { departmentId: bDeptId } };
        bookingFilter = { user: { departmentId: bDeptId } };
        transferFilter = {
          OR: [
            { targetDeptId: bDeptId },
            { allocation: { departmentId: bDeptId } },
            { requestedBy: { departmentId: bDeptId } }
          ]
        };
      } else {
        // Fallback to self
        assetFilter = { allocations: { some: { employeeId: bActorId, status: 'ACTIVE' } } };
        allocFilter = { employeeId: bActorId };
        maintFilter = { raisedById: bActorId };
        bookingFilter = { userId: bActorId };
        transferFilter = { OR: [{ requestedById: bActorId }, { targetEmployeeId: bActorId }] };
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      overdueReturns
    ] = await Promise.all([
      // 1. Available assets
      role === 'ADMIN' || role === 'ASSET_MANAGER'
        ? prisma.asset.count({ where: { status: 'AVAILABLE' } })
        : prisma.asset.count({ where: { ...assetFilter, status: 'AVAILABLE' } }),

      // 2. Allocated assets
      prisma.asset.count({ where: { ...assetFilter, status: 'ALLOCATED' } }),

      // 3. Maintenance requests today
      prisma.maintenanceRequest.count({
        where: {
          ...maintFilter,
          createdAt: { gte: todayStart }
        }
      }),

      // 4. Active/Upcoming bookings
      prisma.booking.count({
        where: {
          ...bookingFilter,
          status: { in: ['UPCOMING', 'ONGOING'] }
        }
      }),

      // 5. Pending transfers
      prisma.transferRequest.count({
        where: {
          ...transferFilter,
          status: 'PENDING'
        }
      }),

      // 6. Upcoming returns
      prisma.allocation.count({
        where: {
          ...allocFilter,
          status: 'ACTIVE',
          expectedReturn: {
            gte: new Date(),
            lte: sevenDaysFromNow
          }
        }
      }),

      // 7. Overdue returns
      prisma.allocation.count({
        where: {
          ...allocFilter,
          status: 'ACTIVE',
          expectedReturn: { lt: new Date() }
        }
      })
    ]);

    res.json({
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      overdueReturns
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
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

<<<<<<< HEAD
    const trend = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayStart = new Date(curr);
      dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(curr);
      dayEnd.setHours(23,59,59,999);

      const count = allocations.filter(a => {
        const created = new Date(a.createdAt);
        const returned = a.actualReturn ? new Date(a.actualReturn) : null;
        return created <= dayEnd && (!returned || returned >= dayStart);
      }).length;

      trend.push({ date: dateStr, allocatedCount: count });
      curr.setDate(curr.getDate() + 1);
    }

    res.json(trend);
=======
    const result = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*)::int AS "allocatedCount"
      FROM allocation
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json(result);
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/maintenance
router.get('/maintenance', authenticate, requireDeptHead, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const categories = await prisma.assetCategory.findMany({
      include: {
        assets: {
          include: {
            maintenanceRequests: true
          }
        }
      }
    });

    const report = categories.map(cat => {
      let totalRequests = 0;
      let totalResolutionTimeMs = 0;
      let resolvedCount = 0;

      cat.assets.forEach(asset => {
        asset.maintenanceRequests.forEach(req => {
          totalRequests++;
          if (req.status === 'RESOLVED' && req.resolvedAt) {
            resolvedCount++;
            const created = new Date(req.createdAt);
            const resolved = new Date(req.resolvedAt);
            totalResolutionTimeMs += (resolved - created);
          }
        });
      });

      const avgResolutionHours = resolvedCount > 0
        ? parseFloat((totalResolutionTimeMs / (1000 * 60 * 60 * resolvedCount)).toFixed(2))
        : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        count: totalRequests,
        avgResolutionHours
      };
    });

    res.json(report);
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/allocations
router.get('/allocations', authenticate, requireDeptHead, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const depts = await prisma.department.findMany({
      include: {
        employees: { select: { id: true } },
        allocations: { where: { status: 'ACTIVE' } }
      }
    });

    const report = depts.map(dept => {
      const totalAssets = dept.allocations.length;
      const employeeCount = dept.employees.length;
      const assetsPerEmployee = employeeCount > 0
        ? parseFloat((totalAssets / employeeCount).toFixed(2))
        : 0;

=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalAssets,
        employeeCount,
        assetsPerEmployee
      };
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/booking-heatmap
router.get('/booking-heatmap', authenticate, requireDeptHead, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const bookings = await prisma.booking.findMany({
      where: { status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] } },
      select: { startTime: true }
    });

    const heatmap = {};
    for (let day = 0; day < 7; day++) {
      heatmap[day] = {};
      for (let hr = 0; hr < 24; hr++) {
        heatmap[day][hr] = 0;
      }
    }

    bookings.forEach(b => {
      const date = new Date(b.startTime);
      const day = date.getDay();
      const hr = date.getHours();
      heatmap[day][hr]++;
    });

    const result = [];
    for (let day = 0; day < 7; day++) {
      for (let hr = 0; hr < 24; hr++) {
        result.push({
          dayOfWeek: day,
          hourOfDay: hr,
          count: heatmap[day][hr]
        });
      }
    }

=======
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

>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/overdue
router.get('/overdue', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const overdue = await allocationService.getOverdue();
    res.json(overdue);
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
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
<<<<<<< HEAD
      const assets = await prisma.asset.findMany({
        include: { category: true }
      });
      csvContent = 'ID,Tag,Name,Category,Status,Condition,Location,Bookable\n';
      assets.forEach(a => {
        csvContent += `"${a.id}","${a.tag}","${a.name}","${a.category.name}","${a.status}","${a.condition || ''}","${a.location || ''}","${a.isBookable}"\n`;
      });
    } else if (type === 'allocations') {
      const allocs = await prisma.allocation.findMany({
        include: { asset: true, employee: true, department: true }
      });
      csvContent = 'ID,Asset Tag,Asset Name,Allocated To Type,Holder Name,Status,Expected Return,Actual Return\n';
      allocs.forEach(a => {
        const holderType = a.employeeId ? 'Employee' : 'Department';
        const holderName = a.employee?.name ?? a.department?.name ?? 'Unknown';
        const expRet = a.expectedReturn ? a.expectedReturn.toISOString().split('T')[0] : '';
        const actRet = a.actualReturn ? a.actualReturn.toISOString().split('T')[0] : '';
        csvContent += `"${a.id}","${a.asset.tag}","${a.asset.name}","${holderType}","${holderName}","${a.status}","${expRet}","${actRet}"\n`;
      });
    } else if (type === 'maintenance') {
      const requests = await prisma.maintenanceRequest.findMany({
        include: { asset: true, raisedBy: true }
      });
      csvContent = 'ID,Asset Tag,Asset Name,Priority,Status,Raised By,Created At,Resolved At\n';
      requests.forEach(r => {
        const created = r.createdAt.toISOString();
        const resolved = r.resolvedAt ? r.resolvedAt.toISOString() : '';
        csvContent += `"${r.id}","${r.asset.tag}","${r.asset.name}","${r.priority}","${r.status}","${r.raisedBy.name}","${created}","${resolved}"\n`;
=======
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
>>>>>>> 2e1280413545e9608bcb4e06d9acef3b88f6215a
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
