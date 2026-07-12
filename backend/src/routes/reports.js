/**
 * routes/reports.js — Analytics & Reports
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireDeptHead } = require('../middleware/roleGuard');

// GET /api/reports/dashboard
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const actor = req.user;
    
    // Default queries
    let assetsAvailableQuery = "SELECT COUNT(*)::int FROM asset WHERE status = 'AVAILABLE'";
    let assetsAllocatedQuery = "SELECT COUNT(*)::int FROM asset WHERE status = 'ALLOCATED'";
    let maintenanceTodayQuery = "SELECT COUNT(*)::int FROM maintenance_request WHERE DATE(created_at) = CURRENT_DATE";
    let activeBookingsQuery = "SELECT COUNT(*)::int FROM booking WHERE status IN ('UPCOMING', 'ONGOING')";
    let pendingTransfersQuery = "SELECT COUNT(*)::int FROM transfer_request WHERE status = 'PENDING'";
    let upcomingReturnsQuery = "SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND expected_return >= CURRENT_DATE AND expected_return <= CURRENT_DATE + INTERVAL '7 days'";
    let overdueReturnsQuery = "SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND expected_return < CURRENT_DATE";
    
    const params = [];

    // Filter by department if DeptHead
    if (actor.role === 'DEPT_HEAD') {
      const deptsRes = await pool.query('SELECT id FROM department WHERE head_employee_id = $1', [actor.id]);
      if (deptsRes.rows.length > 0) {
        const deptIds = deptsRes.rows.map(r => r.id);
        params.push(deptIds);

        assetsAvailableQuery = `
          SELECT COUNT(*)::int FROM asset a
          WHERE a.status = 'AVAILABLE' AND a.location IN (
            SELECT location FROM asset ast 
            JOIN allocation alloc ON alloc.asset_id = ast.id AND alloc.status = 'ACTIVE'
            WHERE alloc.department_id = ANY($1)
          )
        `;
        assetsAllocatedQuery = `
          SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND department_id = ANY($1)
        `;
        maintenanceTodayQuery = `
          SELECT COUNT(*)::int FROM maintenance_request m
          JOIN employee req ON m.raised_by_id = req.id
          WHERE DATE(m.created_at) = CURRENT_DATE AND req.department_id = ANY($1)
        `;
        activeBookingsQuery = `
          SELECT COUNT(*)::int FROM booking b
          JOIN employee emp ON b.user_id = emp.id
          WHERE b.status IN ('UPCOMING', 'ONGOING') AND emp.department_id = ANY($1)
        `;
        pendingTransfersQuery = `
          SELECT COUNT(*)::int FROM transfer_request tr
          JOIN allocation a ON tr.allocation_id = a.id
          WHERE tr.status = 'PENDING' AND (a.department_id = ANY($1) OR tr.target_department_id = ANY($1))
        `;
        upcomingReturnsQuery = `
          SELECT COUNT(*)::int FROM allocation 
          WHERE status = 'ACTIVE' AND department_id = ANY($1) AND expected_return >= CURRENT_DATE AND expected_return <= CURRENT_DATE + INTERVAL '7 days'
        `;
        overdueReturnsQuery = `
          SELECT COUNT(*)::int FROM allocation 
          WHERE status = 'ACTIVE' AND department_id = ANY($1) AND expected_return < CURRENT_DATE
        `;
      }
    } else if (actor.role === 'EMPLOYEE') {
      // Employees can only see their own metrics
      params.push(actor.id);
      assetsAvailableQuery = "SELECT 0";
      assetsAllocatedQuery = `SELECT COUNT(*)::int FROM allocation WHERE status = 'ACTIVE' AND employee_id = $1`;
      maintenanceTodayQuery = `SELECT COUNT(*)::int FROM maintenance_request WHERE raised_by_id = $1 AND DATE(created_at) = CURRENT_DATE`;
      activeBookingsQuery = `SELECT COUNT(*)::int FROM booking WHERE user_id = $1 AND status IN ('UPCOMING', 'ONGOING')`;
      pendingTransfersQuery = `SELECT COUNT(*)::int FROM transfer_request WHERE requested_by_id = $1 AND status = 'PENDING'`;
      upcomingReturnsQuery = `SELECT COUNT(*)::int FROM allocation WHERE employee_id = $1 AND status = 'ACTIVE' AND expected_return >= CURRENT_DATE AND expected_return <= CURRENT_DATE + INTERVAL '7 days'`;
      overdueReturnsQuery = `SELECT COUNT(*)::int FROM allocation WHERE employee_id = $1 AND status = 'ACTIVE' AND expected_return < CURRENT_DATE`;
    }

    const [
      availableRes,
      allocatedRes,
      maintRes,
      bookingsRes,
      transfersRes,
      upcomingRes,
      overdueRes
    ] = await Promise.all([
      pool.query(assetsAvailableQuery, params),
      pool.query(assetsAllocatedQuery, params),
      pool.query(maintenanceTodayQuery, params),
      pool.query(activeBookingsQuery, params),
      pool.query(pendingTransfersQuery, params),
      pool.query(upcomingReturnsQuery, params),
      pool.query(overdueReturnsQuery, params)
    ]);

    res.json({
      assetsAvailable: availableRes.rows[0].count || 0,
      assetsAllocated: allocatedRes.rows[0].count || 0,
      maintenanceToday: maintRes.rows[0].count || 0,
      activeBookings: bookingsRes.rows[0].count || 0,
      pendingTransfers: transfersRes.rows[0].count || 0,
      upcomingReturns: upcomingRes.rows[0].count || 0,
      overdueReturns: overdueRes.rows[0].count || 0
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/reports/utilization
router.get('/utilization', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000); // last 30 days
    const endDate = to ? new Date(to) : new Date();

    const result = await pool.query(
      `
      SELECT 
        DATE(created_at) AS date,
        COUNT(*)::int AS "allocatedCount"
      FROM allocation
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      [startDate, endDate]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/maintenance
router.get('/maintenance', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
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
      `
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/allocations
router.get('/allocations', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        d.name AS department,
        (SELECT COUNT(*)::int FROM allocation a WHERE a.department_id = d.id AND a.status = 'ACTIVE') AS "totalAssets",
        (SELECT COUNT(*)::int FROM employee e WHERE e.department_id = d.id AND e.status = true) AS "totalEmployees"
      FROM department d
      WHERE d.status = true
      ORDER BY d.name ASC
      `
    );

    const allocations = result.rows.map(r => {
      const totalAssets = r.totalAssets || 0;
      const totalEmployees = r.totalEmployees || 0;
      return {
        department: r.department,
        totalAssets,
        totalEmployees,
        assetsPerEmployee: totalEmployees > 0 ? parseFloat((totalAssets / totalEmployees).toFixed(2)) : 0
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
    const result = await pool.query(
      `
      SELECT 
        EXTRACT(DOW FROM start_time)::int AS weekday,
        EXTRACT(HOUR FROM start_time)::int AS hour,
        COUNT(*)::int AS count
      FROM booking
      WHERE status != 'CANCELLED'
      GROUP BY EXTRACT(DOW FROM start_time), EXTRACT(HOUR FROM start_time)
      ORDER BY weekday, hour
      `
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/overdue
router.get('/overdue', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
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
      `
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/export/:type
router.get('/export/:type', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const { type } = req.params;
    let csvData = '';
    let filename = '';

    if (type === 'assets') {
      filename = 'assets_report.csv';
      const result = await pool.query(
        `SELECT tag, name, status, condition, location, acquisition_date FROM asset ORDER BY tag ASC`
      );
      csvData = 'Tag,Name,Status,Condition,Location,Acquisition Date\n';
      result.rows.forEach(r => {
        csvData += `"${r.tag}","${r.name}","${r.status}","${r.condition}","${r.location || ''}","${r.acquisition_date ? new Date(r.acquisition_date).toLocaleDateString() : ''}"\n`;
      });
    } else if (type === 'allocations') {
      filename = 'allocations_report.csv';
      const result = await pool.query(
        `
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
        `
      );
      csvData = 'Asset Tag,Asset Name,Employee Name,Department Name,Status,Expected Return\n';
      result.rows.forEach(r => {
        csvData += `"${r.asset_tag}","${r.asset_name}","${r.employee_name || ''}","${r.department_name || ''}","${r.status}","${r.expected_return ? new Date(r.expected_return).toLocaleDateString() : ''}"\n`;
      });
    } else if (type === 'maintenance') {
      filename = 'maintenance_report.csv';
      const result = await pool.query(
        `
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
        `
      );
      csvData = 'Request ID,Asset Tag,Priority,Status,Description,Created At\n';
      result.rows.forEach(r => {
        csvData += `"${r.id}","${r.asset_tag}","${r.priority}","${r.status}","${r.description.replace(/"/g, '""')}","${new Date(r.created_at).toLocaleString()}"\n`;
      });
    } else {
      return res.status(400).json({ error: 'Invalid export type. Must be: assets, allocations, or maintenance.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);

  } catch (err) {
    next(err);
  }
});

module.exports = router;
