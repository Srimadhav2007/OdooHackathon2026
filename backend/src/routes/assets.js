/**
 * routes/assets.js — Asset Registry
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');

// Multer config for asset photos
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper to generate the next asset tag
async function generateNextTag() {
  try {
    const result = await pool.query(
      `SELECT tag FROM asset WHERE tag ~ '^AF-[0-9]+$' ORDER BY tag DESC LIMIT 1`
    );
    if (result.rows.length === 0) {
      return 'AF-0001';
    }
    const lastTag = result.rows[0].tag;
    const numPart = parseInt(lastTag.replace('AF-', ''), 10);
    const nextNum = numPart + 1;
    const paddedNum = String(nextNum).padStart(4, '0');
    return `AF-${paddedNum}`;
  } catch (err) {
    console.error('Error generating asset tag:', err);
    throw err;
  }
}

// Helper to map asset row
function mapAssetRow(row) {
  return {
    id: row.id,
    tag: row.tag,
    name: row.name,
    categoryId: row.categoryId,
    serialNumber: row.serialNumber,
    acquisitionDate: row.acquisitionDate,
    acquisitionCost: row.acquisitionCost ? parseFloat(row.acquisitionCost) : null,
    condition: row.condition,
    status: row.status,
    location: row.location,
    isBookable: row.isBookable,
    photoUrl: row.photoUrl,
    documents: row.documents || null,
    createdAt: row.createdAt,
    category: {
      id: row.categoryId,
      name: row.category_name
    },
    currentAllocation: row.allocation_id ? {
      id: row.allocation_id,
      employeeId: row.allocation_employee_id,
      departmentId: row.allocation_department_id,
      employeeName: row.allocation_employee_name,
      departmentName: row.allocation_department_name,
      holderName: row.allocation_employee_name || row.allocation_department_name
    } : null
  };
}

// GET /api/assets
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { tag, status, categoryId, departmentId, location, isBookable, search, page = 1, limit = 10 } = req.query;

<<<<<<< HEAD
    const where = {
      ...(tag && { tag: { contains: tag, mode: 'insensitive' } }),
      ...(status && { status }),
      ...(categoryId && { categoryId: BigInt(categoryId) }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
      ...(isBookable !== undefined && { isBookable: isBookable === 'true' }),
      ...(search && {
        OR: [
          { tag: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
=======
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);
>>>>>>> 1052e57 (Updated the backend)

    let whereClause = ' WHERE 1=1';
    const params = [];

    if (tag) {
      whereClause += ` AND a.tag = $${params.length + 1}`;
      params.push(tag);
    }

    if (status) {
      whereClause += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    if (categoryId) {
      whereClause += ` AND a.category_id = $${params.length + 1}`;
      params.push(categoryId);
    }

    if (departmentId) {
      // Filter by department of active allocation
      whereClause += ` AND alloc.department_id = $${params.length + 1}`;
      params.push(departmentId);
    }

    if (location) {
      whereClause += ` AND a.location = $${params.length + 1}`;
      params.push(location);
    }

    if (isBookable !== undefined) {
      const bookableVal = isBookable === 'true' || isBookable === '1';
      whereClause += ` AND a.is_bookable = $${params.length + 1}`;
      params.push(bookableVal);
    }

    if (search) {
      whereClause += ` AND (a.tag ILIKE $${params.length + 1} OR a.name ILIKE $${params.length + 1} OR a.serial_number ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    // Count total rows
    const countQuery = `
      SELECT COUNT(DISTINCT a.id)::int AS total
      FROM asset a
      LEFT JOIN allocation alloc ON alloc.asset_id = a.id AND alloc.status = 'ACTIVE'
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0].total;

    // Fetch paginated rows
    const selectQuery = `
      SELECT 
        a.id, 
        a.tag, 
        a.name, 
        a.category_id AS "categoryId", 
        a.serial_number AS "serialNumber", 
        a.acquisition_date AS "acquisitionDate", 
        a.acquisition_cost AS "acquisitionCost", 
        a.condition, 
        a.status, 
        a.location, 
        a.is_bookable AS "isBookable", 
        a.photo_url AS "photoUrl", 
        a.documents, 
        a.created_at AS "createdAt",
        c.name AS category_name,
        alloc.id AS allocation_id,
        alloc.employee_id AS allocation_employee_id,
        alloc.department_id AS allocation_department_id,
        emp.name AS allocation_employee_name,
        dept.name AS allocation_department_name
      FROM asset a
      JOIN asset_category c ON a.category_id = c.id
      LEFT JOIN allocation alloc ON alloc.asset_id = a.id AND alloc.status = 'ACTIVE'
      LEFT JOIN employee emp ON alloc.employee_id = emp.id
      LEFT JOIN department dept ON alloc.department_id = dept.id
      ${whereClause}
      ORDER BY a.tag ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const selectParams = [...params, limitNum, offset];
    const selectResult = await pool.query(selectQuery, selectParams);

    const assets = selectResult.rows.map(mapAssetRow);

    res.json({
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      assets
    });

  } catch (err) {
    next(err);
  }
});

// POST /api/assets
router.post('/', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const { name, categoryId, serialNumber, acquisitionDate, acquisitionCost, condition, location, isBookable, customValues } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and Category ID are required' });
    }

<<<<<<< HEAD
    const category = await prisma.assetCategory.findUnique({ where: { id: BigInt(categoryId) } });
    if (!category) return res.status(404).json({ error: 'Category not found' });
=======
    // Verify category exists
    const catCheck = await pool.query('SELECT id FROM asset_category WHERE id = $1', [categoryId]);
    if (catCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Category not found' });
    }
>>>>>>> 1052e57 (Updated the backend)

    // Generate tag
    const nextTag = await generateNextTag();

<<<<<<< HEAD
    const asset = await prisma.asset.create({
      data: {
        tag,
        name,
        categoryId: BigInt(categoryId),
        serialNumber: serialNumber || null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        acquisitionCost: acquisitionCost ? parseFloat(acquisitionCost) : null,
        condition: condition || 'GOOD',
        status: 'AVAILABLE',
        location: location || null,
        isBookable: isBookable === true || isBookable === 'true',
        customValues: customValues || null,
      },
      include: { category: true },
    });

    await prisma.activityLog.create({
      data: {
        actorId: BigInt(req.user.id),
        action: 'REGISTERED_ASSET',
        entity: 'ASSET',
        entityId: asset.id,
        metadata: { tag: asset.tag, name: asset.name },
      },
    });
=======
    const result = await pool.query(
      `
      INSERT INTO asset (
        tag, name, category_id, serial_number, acquisition_date, 
        acquisition_cost, condition, status, location, is_bookable, custom_values
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'AVAILABLE', $8, $9, $10)
      RETURNING 
        id, tag, name, category_id AS "categoryId", serial_number AS "serialNumber", 
        acquisition_date AS "acquisitionDate", acquisition_cost AS "acquisitionCost", 
        condition, status, location, is_bookable AS "isBookable", created_at AS "createdAt"
      `,
      [
        nextTag, 
        name.trim(), 
        categoryId, 
        serialNumber || null, 
        acquisitionDate ? new Date(acquisitionDate) : null,
        acquisitionCost ? parseFloat(acquisitionCost) : null, 
        condition || 'GOOD', 
        location || null, 
        isBookable === true || isBookable === 'true',
        customValues ? JSON.stringify(customValues) : null
      ]
    );

    const assetRow = result.rows[0];

    // Log Activity
    await pool.query(
      `
      INSERT INTO activity_log (actor_id, action, entity, entity_id, metadata)
      VALUES ($1, 'REGISTER_ASSET', 'ASSET', $2, $3)
      `,
      [req.user.id, assetRow.id, JSON.stringify({ tag: nextTag, name })]
    );

    res.status(201).json(assetRow);
>>>>>>> 1052e57 (Updated the backend)

  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const asset = await prisma.asset.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        category: true,
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            employee: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
          },
          take: 1,
        },
        maintenanceRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { raisedBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
=======
    const { id } = req.params;

    const selectQuery = `
      SELECT 
        a.id, 
        a.tag, 
        a.name, 
        a.category_id AS "categoryId", 
        a.serial_number AS "serialNumber", 
        a.acquisition_date AS "acquisitionDate", 
        a.acquisition_cost AS "acquisitionCost", 
        a.condition, 
        a.status, 
        a.location, 
        a.is_bookable AS "isBookable", 
        a.photo_url AS "photoUrl", 
        a.documents, 
        a.created_at AS "createdAt",
        c.name AS category_name,
        alloc.id AS allocation_id,
        alloc.employee_id AS allocation_employee_id,
        alloc.department_id AS allocation_department_id,
        emp.name AS allocation_employee_name,
        dept.name AS allocation_department_name
      FROM asset a
      JOIN asset_category c ON a.category_id = c.id
      LEFT JOIN allocation alloc ON alloc.asset_id = a.id AND alloc.status = 'ACTIVE'
      LEFT JOIN employee emp ON alloc.employee_id = emp.id
      LEFT JOIN department dept ON alloc.department_id = dept.id
      WHERE a.id = $1
    `;
    const result = await pool.query(selectQuery, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = mapAssetRow(result.rows[0]);

    // Fetch recent maintenance requests
    const maintenanceRes = await pool.query(
      `
      SELECT 
        m.id, 
        m.priority, 
        m.status, 
        m.description, 
        m.raised_by_id AS "raisedById", 
        e.name AS "raisedByName",
        m.created_at AS "createdAt"
      FROM maintenance_request m
      LEFT JOIN employee e ON m.raised_by_id = e.id
      WHERE m.asset_id = $1
      ORDER BY m.created_at DESC
      LIMIT 5
      `,
      [id]
    );
    asset.recentMaintenance = maintenanceRes.rows;

>>>>>>> 1052e57 (Updated the backend)
    res.json(asset);

  } catch (err) {
    next(err);
  }
});

// PUT /api/assets/:id
router.put('/:id', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, categoryId, serialNumber, acquisitionDate, acquisitionCost, condition, location, isBookable, customValues } = req.body;

<<<<<<< HEAD
    const asset = await prisma.asset.update({
      where: { id: BigInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(acquisitionDate && { acquisitionDate: new Date(acquisitionDate) }),
        ...(acquisitionCost !== undefined && { acquisitionCost: parseFloat(acquisitionCost) }),
        ...(condition && { condition }),
        ...(location !== undefined && { location }),
        ...(isBookable !== undefined && { isBookable: isBookable === true || isBookable === 'true' }),
        ...(customValues !== undefined && { customValues }),
      },
      include: { category: true },
    });

    await prisma.activityLog.create({
      data: {
        actorId: BigInt(req.user.id),
        action: 'UPDATED_ASSET',
        entity: 'ASSET',
        entityId: asset.id,
        metadata: req.body,
      },
    });
=======
    const assetCheck = await pool.query('SELECT * FROM asset WHERE id = $1', [id]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const currentAsset = assetCheck.rows[0];

    // Validate category if changing
    if (categoryId && categoryId !== currentAsset.category_id) {
      const catCheck = await pool.query('SELECT id FROM asset_category WHERE id = $1', [categoryId]);
      if (catCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    const updatedName = name !== undefined ? name.trim() : currentAsset.name;
    const updatedCatId = categoryId !== undefined ? categoryId : currentAsset.category_id;
    const updatedSerial = serialNumber !== undefined ? serialNumber : currentAsset.serial_number;
    const updatedAcqDate = acquisitionDate !== undefined ? (acquisitionDate ? new Date(acquisitionDate) : null) : currentAsset.acquisition_date;
    const updatedAcqCost = acquisitionCost !== undefined ? (acquisitionCost ? parseFloat(acquisitionCost) : null) : currentAsset.acquisition_cost;
    const updatedCondition = condition !== undefined ? condition : currentAsset.condition;
    const updatedLocation = location !== undefined ? location : currentAsset.location;
    const updatedBookable = isBookable !== undefined ? (isBookable === true || isBookable === 'true') : currentAsset.is_bookable;
    const updatedCustomVals = customValues !== undefined ? JSON.stringify(customValues) : JSON.stringify(currentAsset.custom_values);

    const result = await pool.query(
      `
      UPDATE asset
      SET 
        name = $1, category_id = $2, serial_number = $3, acquisition_date = $4, 
        acquisition_cost = $5, condition = $6, location = $7, is_bookable = $8, custom_values = $9
      WHERE id = $10
      RETURNING 
        id, tag, name, category_id AS "categoryId", serial_number AS "serialNumber", 
        acquisition_date AS "acquisitionDate", acquisition_cost AS "acquisitionCost", 
        condition, status, location, is_bookable AS "isBookable", created_at AS "createdAt"
      `,
      [
        updatedName, updatedCatId, updatedSerial, updatedAcqDate, 
        updatedAcqCost, updatedCondition, updatedLocation, updatedBookable, updatedCustomVals, 
        id
      ]
    );

    res.json(result.rows[0]);
>>>>>>> 1052e57 (Updated the backend)

  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id/history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
<<<<<<< HEAD
    const asset = await prisma.asset.findUnique({ where: { id: BigInt(req.params.id) } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const [allocations, maintenance] = await Promise.all([
      prisma.allocation.findMany({
        where: { assetId: BigInt(req.params.id) },
        include: {
          employee: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          transferRequest: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.maintenanceRequest.findMany({
        where: { assetId: BigInt(req.params.id) },
        include: { raisedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
=======
    const { id } = req.params;

    // Check asset exists
    const assetCheck = await pool.query('SELECT tag FROM asset WHERE id = $1', [id]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
>>>>>>> 1052e57 (Updated the backend)

    // Fetch allocations history
    const allocationsRes = await pool.query(
      `
      SELECT 
        'ALLOCATION' AS type,
        a.id,
        a.status,
        a.created_at AS date,
        emp.name AS actor,
        CONCAT('Allocated to ', COALESCE(emp.name, dept.name)) AS detail
      FROM allocation a
      LEFT JOIN employee emp ON a.employee_id = emp.id
      LEFT JOIN department dept ON a.department_id = dept.id
      WHERE a.asset_id = $1
      `,
      [id]
    );

    // Fetch maintenance requests history
    const maintenanceRes = await pool.query(
      `
      SELECT 
        'MAINTENANCE' AS type,
        m.id,
        m.status,
        m.created_at AS date,
        emp.name AS actor,
        CONCAT('Priority: ', m.priority, '. ', m.description) AS detail
      FROM maintenance_request m
      LEFT JOIN employee emp ON m.raised_by_id = emp.id
      WHERE m.asset_id = $1
      `,
      [id]
    );

    // Merge & Sort chronological timeline
    const timeline = [...allocationsRes.rows, ...maintenanceRes.rows].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.json(timeline);

  } catch (err) {
    next(err);
  }
});

// POST /api/assets/:id/photo
router.post('/:id/photo', authenticate, requireAssetManager, upload.single('photo'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

<<<<<<< HEAD
    const photoUrl = `/uploads/${req.file.filename}`;
    const asset = await prisma.asset.update({
      where: { id: BigInt(req.params.id) },
      data: { photoUrl },
    });
=======
    const assetCheck = await pool.query('SELECT id FROM asset WHERE id = $1', [id]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const photoPath = `/uploads/${req.file.filename}`;

    await pool.query(
      'UPDATE asset SET photo_url = $1 WHERE id = $2',
      [photoPath, id]
    );

    res.json({ message: 'Asset photo uploaded successfully', photoUrl: photoPath });
>>>>>>> 1052e57 (Updated the backend)

  } catch (err) {
    next(err);
  }
});

module.exports = router;
