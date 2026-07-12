/**
 * routes/departments.js — Department management (Admin only)
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');

const prisma = new PrismaClient();

// Helper to map Prisma row to response format
function mapDepartmentRow(dept) {
  return {
    id: dept.id,
    name: dept.name,
    parentId: dept.parentId,
    headId: dept.headId,
    status: dept.status ? 'ACTIVE' : 'INACTIVE',
    createdAt: dept.createdAt,
    parent: dept.parent ? { id: dept.parent.id, name: dept.parent.name } : null,
    head: dept.head ? { id: dept.head.id, name: dept.head.name, email: dept.head.email } : null,
    _count: {
      employees: dept._count?.employees || 0
    }
  };
}

// GET /api/departments
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status === 'ACTIVE') where.status = true;
    else if (status === 'INACTIVE') where.status = false;

    const departments = await prisma.department.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        head: { select: { id: true, name: true, email: true } },
        _count: {
          select: { employees: { where: { status: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mappedDepts = departments.map(mapDepartmentRow);

    // Build children array
    for (const dept of mappedDepts) {
      dept.children = mappedDepts.filter((d) => d.parentId?.toString() === dept.id.toString());
    }

    res.json(mappedDepts);
  } catch (err) {
    next(err);
  }
});

// POST /api/departments
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, parentId, headId } = req.body;

    if (!name) return res.status(400).json({ error: 'Department name is required' });

    // Verify parent
    if (parentId) {
      const parent = await prisma.department.findFirst({
        where: { id: BigInt(parentId), status: true }
      });
      if (!parent) return res.status(400).json({ error: 'Parent department not found or inactive' });
    }

    // Verify head
    if (headId) {
      const head = await prisma.employee.findFirst({
        where: { id: BigInt(headId), status: true }
      });
      if (!head) return res.status(400).json({ error: 'Head employee not found or inactive' });
    }

    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        parentId: parentId ? BigInt(parentId) : null,
        headId: headId ? BigInt(headId) : null,
        status: true,
      },
      include: {
        parent: { select: { id: true, name: true } },
        head: { select: { id: true, name: true, email: true } },
      }
    });

    res.status(201).json(mapDepartmentRow(dept));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Department name already exists' });
    next(err);
  }
});

// GET /api/departments/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);

    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        head: { select: { id: true, name: true, email: true } },
        employees: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, email: true, role: true, status: true }
        },
        allocations: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          include: {
            asset: { select: { name: true, tag: true } }
          }
        },
        _count: {
          select: { employees: { where: { status: true } } }
        }
      }
    });

    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const mapped = mapDepartmentRow(dept);
    
    // Map nested fields
    mapped.employees = dept.employees.map(e => ({
      ...e,
      status: e.status ? 'ACTIVE' : 'INACTIVE'
    }));

    mapped.allocations = dept.allocations.map(a => ({
      id: a.id,
      assetId: a.assetId,
      status: a.status,
      expectedReturn: a.expectedReturn,
      assetName: a.asset?.name,
      assetTag: a.asset?.tag
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// PUT /api/departments/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { name, parentId, headId, status } = req.body;

    const currentDept = await prisma.department.findUnique({ where: { id } });
    if (!currentDept) return res.status(404).json({ error: 'Department not found' });

    if (parentId !== undefined) {
      if (parentId?.toString() === id.toString()) {
        return res.status(400).json({ error: 'A department cannot be its own parent' });
      }
      if (parentId) {
        const parentCheck = await prisma.department.findFirst({
          where: { id: BigInt(parentId), status: true }
        });
        if (!parentCheck) return res.status(400).json({ error: 'Parent department not found or inactive' });
      }
    }

    if (headId !== undefined && headId !== null) {
      const headCheck = await prisma.employee.findFirst({
        where: { id: BigInt(headId), status: true }
      });
      if (!headCheck) return res.status(400).json({ error: 'Head employee not found or inactive' });
      if (headCheck.departmentId?.toString() !== id.toString()) {
        return res.status(400).json({ error: 'Head employee must belong to this department' });
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(parentId !== undefined && { parentId: parentId ? BigInt(parentId) : null }),
        ...(headId !== undefined && { headId: headId ? BigInt(headId) : null }),
        ...(status !== undefined && { status: status === 'ACTIVE' || status === true }),
      },
      include: {
        parent: { select: { id: true, name: true } },
        head: { select: { id: true, name: true, email: true } },
        _count: {
          select: { employees: { where: { status: true } } }
        }
      }
    });

    res.json(mapDepartmentRow(updated));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Department name already exists' });
    next(err);
  }
});

// DELETE /api/departments/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);

    const currentDept = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: { where: { status: true } },
            allocations: { where: { status: 'ACTIVE' } }
          }
        }
      }
    });

    if (!currentDept) return res.status(404).json({ error: 'Department not found' });

    if (currentDept._count.employees > 0) {
      return res.status(400).json({ error: 'Cannot deactivate department with active employees' });
    }

    if (currentDept._count.allocations > 0) {
      return res.status(400).json({ error: 'Cannot deactivate department with active asset allocations' });
    }

    await prisma.department.update({
      where: { id },
      data: { status: false }
    });

    res.json({ message: 'Department deactivated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
