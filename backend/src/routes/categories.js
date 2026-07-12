/**
 * routes/categories.js — Asset Category management (Admin only)
 *
 * GET    /api/categories       — List all categories
 * POST   /api/categories       — Create category
 * GET    /api/categories/:id   — Get single category
 * PUT    /api/categories/:id   — Update category + custom fields schema
 * DELETE /api/categories/:id   — Delete (only if no assets assigned)
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
      include: { _count: { select: { assets: true } } },
      orderBy: { name: 'asc' },
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
    if (!name) return res.status(400).json({ error: 'name is required' });

    const category = await prisma.assetCategory.create({
      data: {
        name,
        description: description || null,
        customFields: customFields || null,
      },
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
      where: { id: req.params.id },
      include: {
        assets: {
          select: { id: true, tag: true, name: true, status: true, condition: true },
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
    const { name, description, customFields } = req.body;
    const category = await prisma.assetCategory.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(customFields !== undefined && { customFields }),
      },
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
    const count = await prisma.asset.count({ where: { categoryId: req.params.id } });
    if (count > 0)
      return res.status(409).json({ error: `Cannot delete: ${count} asset(s) belong to this category` });

    await prisma.assetCategory.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    next(err);
  }
});

module.exports = router;
