/**
 * routes/categories.js — Asset Category management (Admin only)
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');

const prisma = new PrismaClient();

// GET /api/categories
router.get('/', authenticate, async (req, res, next) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { assets: true } }
      }
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, customFields } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check uniqueness
    const existing = await prisma.assetCategory.findUnique({
      where: { name: name.trim() }
    });
    if (existing) {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    const category = await prisma.assetCategory.create({
      data: {
        name: name.trim(),
        description: description || null,
        customFields: customFields || null
      },
      include: {
        _count: { select: { assets: true } }
      }
    });

    res.status(201).json(category);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category name already exists' });
    next(err);
  }
});

// GET /api/categories/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const category = await prisma.assetCategory.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        assets: {
          select: { id: true, tag: true, name: true, status: true, condition: true, location: true },
          take: 20,
        },
        _count: { select: { assets: true } },
      },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);
    const { name, description, customFields } = req.body;

    const cat = await prisma.assetCategory.findUnique({ where: { id: bId } });
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    // Check name uniqueness if changing
    if (name && name.trim() !== cat.name) {
      const existing = await prisma.assetCategory.findUnique({
        where: { name: name.trim() }
      });
      if (existing) {
        return res.status(409).json({ error: 'Category name already exists' });
      }
    }

    const category = await prisma.assetCategory.update({
      where: { id: bId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(customFields !== undefined && { customFields }),
      },
      include: {
        _count: { select: { assets: true } }
      }
    });

    res.json(category);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Category name already exists' });
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bId = BigInt(req.params.id);

    const cat = await prisma.assetCategory.findUnique({ where: { id: bId } });
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    // Reject if assets exist under this category
    const count = await prisma.asset.count({ where: { categoryId: bId } });
    if (count > 0) {
      return res.status(409).json({ error: `Cannot delete: ${count} asset(s) belong to this category` });
    }

    await prisma.assetCategory.delete({ where: { id: bId } });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    next(err);
  }
});

module.exports = router;
