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

// GET /api/reports/dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/maintenance
router.get('/maintenance', authenticate, requireDeptHead, async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/allocations
router.get('/allocations', authenticate, requireDeptHead, async (req, res, next) => {
  try {
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

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/overdue
router.get('/overdue', authenticate, async (req, res, next) => {
  try {
    const overdue = await allocationService.getOverdue();
    res.json(overdue);
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
