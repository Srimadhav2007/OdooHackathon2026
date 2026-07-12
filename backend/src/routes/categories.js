/**
 * routes/categories.js — Asset Category management (Admin only)
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleGuard');

// Helper to map DB row to response
function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    customFields: row.customFields || null,
    _count: {
      assets: parseInt(row.assets_count || 0, 10)
    }
  };
}

// GET /api/categories
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        c.id, 
        c.name, 
        c.description, 
        c.custom_fields AS "customFields",
        (SELECT COUNT(*)::int FROM asset a WHERE a.category_id = c.id) AS assets_count
      FROM asset_category c
      ORDER BY c.name ASC
      `
    );

    res.json(result.rows.map(mapCategoryRow));
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
    const existing = await pool.query('SELECT id FROM asset_category WHERE name = $1', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    const cFields = customFields ? JSON.stringify(customFields) : null;

    const result = await pool.query(
      `
      INSERT INTO asset_category (name, description, custom_fields)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, custom_fields AS "customFields"
      `,
      [name.trim(), description || null, cFields]
    );

    const category = result.rows[0];
    category._count = { assets: 0 };

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const category = await prisma.assetCategory.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        assets: {
          select: { id: true, tag: true, name: true, status: true, condition: true },
          take: 20,
        },
        _count: { select: { assets: true } },
      },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
=======
    const { id } = req.params;

    const catRes = await pool.query(
      `
      SELECT 
        c.id, 
        c.name, 
        c.description, 
        c.custom_fields AS "customFields",
        (SELECT COUNT(*)::int FROM asset a WHERE a.category_id = c.id) AS assets_count
      FROM asset_category c
      WHERE c.id = $1
      `,
      [id]
    );

    if (catRes.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = mapCategoryRow(catRes.rows[0]);

    // Fetch associated assets
    const assetsRes = await pool.query(
      `SELECT id, tag, name, status, condition, location FROM asset WHERE category_id = $1 ORDER BY tag ASC`,
      [id]
    );
    category.assets = assetsRes.rows;

>>>>>>> 1052e57 (Updated the backend)
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, customFields } = req.body;
<<<<<<< HEAD
    const category = await prisma.assetCategory.update({
      where: { id: BigInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(customFields !== undefined && { customFields }),
      },
    });
=======

    const catCheck = await pool.query('SELECT * FROM asset_category WHERE id = $1', [id]);
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const currentCat = catCheck.rows[0];

    // Check name uniqueness if changing
    if (name && name.trim() !== currentCat.name) {
      const existing = await pool.query('SELECT id FROM asset_category WHERE name = $1', [name.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Category name already exists' });
      }
    }

    const updatedName = name !== undefined ? name.trim() : currentCat.name;
    const updatedDesc = description !== undefined ? description : currentCat.description;
    const updatedFields = customFields !== undefined ? JSON.stringify(customFields) : JSON.stringify(currentCat.custom_fields);

    const result = await pool.query(
      `
      UPDATE asset_category
      SET name = $1, description = $2, custom_fields = $3
      WHERE id = $4
      RETURNING id, name, description, custom_fields AS "customFields"
      `,
      [updatedName, updatedDesc, updatedFields, id]
    );

    const category = result.rows[0];
    
    // Fetch asset count
    const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM asset WHERE category_id = $1', [id]);
    category._count = { assets: countRes.rows[0].count };

>>>>>>> 1052e57 (Updated the backend)
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const count = await prisma.asset.count({ where: { categoryId: BigInt(req.params.id) } });
    if (count > 0)
      return res.status(409).json({ error: `Cannot delete: ${count} asset(s) belong to this category` });

    await prisma.assetCategory.delete({ where: { id: BigInt(req.params.id) } });
=======
    const { id } = req.params;

    const catCheck = await pool.query('SELECT id FROM asset_category WHERE id = $1', [id]);
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Reject if assets exist under this category
    const assetCheck = await pool.query('SELECT COUNT(*)::int AS count FROM asset WHERE category_id = $1', [id]);
    if (assetCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with associated assets' });
    }

    await pool.query('DELETE FROM asset_category WHERE id = $1', [id]);

>>>>>>> 1052e57 (Updated the backend)
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
