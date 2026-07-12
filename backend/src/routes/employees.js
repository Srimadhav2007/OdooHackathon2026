/**
 * routes/employees.js — Employee Directory management
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireDeptHead } = require('../middleware/roleGuard');
const notificationService = require('../services/notificationService');

const prisma = new PrismaClient();

// Helper to map Prisma row
function mapEmployeeRow(emp) {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    status: emp.status ? 'ACTIVE' : 'INACTIVE',
    departmentId: emp.departmentId,
    createdAt: emp.createdAt,
    department: emp.department ? { id: emp.department.id, name: emp.department.name } : null
  };
}

// GET /api/employees
router.get('/', authenticate, requireDeptHead, async (req, res, next) => {
  try {
    const { role, status, departmentId, search } = req.query;
    const actor = req.user;

    const where = {};

    // Role-based scope filtering
    if (actor.role === 'DEPT_HEAD') {
      const depts = await prisma.department.findMany({
        where: { headId: BigInt(actor.id) },
        select: { id: true }
      });
      
      if (depts.length > 0) {
        where.departmentId = { in: depts.map(d => d.id) };
      } else {
        if (actor.departmentId) {
          where.departmentId = BigInt(actor.departmentId);
        } else {
          where.id = BigInt(actor.id);
        }
      }
    }

    if (role) where.role = role;
    if (status !== undefined) where.status = status === 'ACTIVE' || status === 'true';
    if (departmentId) where.departmentId = BigInt(departmentId);
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(employees.map(mapEmployeeRow));
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const actor = req.user;

    const emp = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          include: { asset: { select: { name: true, tag: true } } }
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    // Guard: employees can only view their own profile unless manager+
    if (actor.role === 'EMPLOYEE' && actor.id.toString() !== id.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
    }

    if (actor.role === 'DEPT_HEAD') {
      const depts = await prisma.department.findMany({
        where: { headId: BigInt(actor.id) },
        select: { id: true }
      });
      const deptIds = depts.map(d => d.id.toString());
      
      const belongsToDept = emp.departmentId && deptIds.includes(emp.departmentId.toString());
      if (!belongsToDept && actor.id.toString() !== id.toString()) {
        return res.status(403).json({ error: 'Access denied. Department Head can only view members of their own department.' });
      }
    }

    const mapped = mapEmployeeRow(emp);
    
    mapped.allocations = emp.allocations.map(a => ({
      id: a.id,
      assetId: a.assetId,
      status: a.status,
      expectedReturn: a.expectedReturn,
      assetName: a.asset?.name,
      assetTag: a.asset?.tag
    }));

    mapped.activity = emp.activityLogs;

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id — Update basic info (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { name, departmentId, status } = req.body;

    const currentEmp = await prisma.employee.findUnique({ where: { id } });
    if (!currentEmp) return res.status(404).json({ error: 'Employee not found' });

    if (departmentId !== undefined && departmentId !== null) {
      const deptCheck = await prisma.department.findFirst({
        where: { id: BigInt(departmentId), status: true }
      });
      if (!deptCheck) return res.status(400).json({ error: 'Department not found or inactive' });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(departmentId !== undefined && { departmentId: departmentId ? BigInt(departmentId) : null }),
        ...(status !== undefined && { status: status === 'ACTIVE' || status === true }),
      },
      include: {
        department: { select: { id: true, name: true } }
      }
    });

    res.json(mapEmployeeRow(updated));
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id/role — Role promotion (ADMIN ONLY)
router.put('/:id/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { role } = req.body;

    if (!role) return res.status(400).json({ error: 'Role is required' });

    const validRoles = ['EMPLOYEE', 'DEPT_HEAD', 'ASSET_MANAGER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selection. Must be one of: EMPLOYEE, DEPT_HEAD, ASSET_MANAGER' });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    if (employee.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin role cannot be changed through this endpoint' });
    }

    await prisma.$transaction([
      prisma.employee.update({
        where: { id },
        data: { role }
      }),
      prisma.activityLog.create({
        data: {
          actorId: BigInt(req.user.id),
          action: 'PROMOTED_ROLE',
          entity: 'EMPLOYEE',
          entityId: id,
          metadata: { oldRole: employee.role, newRole: role }
        }
      })
    ]);

    const msg = `Your role has been updated from ${employee.role} to ${role} by Admin.`;
    await notificationService.send(id, 'ASSET_ASSIGNED', msg, id, 'EMPLOYEE');

    res.json({ message: 'Employee role updated successfully', id: id.toString(), role });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
