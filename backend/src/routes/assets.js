/**
 * routes/assets.js — Asset Registry
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAssetManager } = require('../middleware/roleGuard');

const prisma = new PrismaClient();

// Multer config for asset photos
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Helper: generate next asset tag ──────────────────────────────────────────
async function generateTag() {
  const last = await prisma.asset.findFirst({
    orderBy: { tag: 'desc' },
    select: { tag: true },
  });
  if (!last) return 'AF-0001';
  const num = parseInt(last.tag.split('-')[1], 10) + 1;
  return `AF-${String(num).padStart(4, '0')}`;
}

// GET /api/assets
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      tag, status, categoryId, location, isBookable, search,
      page = 1, limit = 20,
    } = req.query;

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

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          allocations: {
            where: { status: 'ACTIVE' },
            include: {
              employee: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
            },
            take: 1,
          },
        },
        orderBy: { tag: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.asset.count({ where }),
    ]);

    res.json({
      data: assets,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets
router.post('/', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const {
      name, categoryId, serialNumber, acquisitionDate,
      acquisitionCost, condition, location, isBookable, customValues,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });

    const category = await prisma.assetCategory.findUnique({ where: { id: BigInt(categoryId) } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const tag = await generateTag();

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

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
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
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

// PUT /api/assets/:id
router.put('/:id', authenticate, requireAssetManager, async (req, res, next) => {
  try {
    const {
      name, serialNumber, acquisitionDate, acquisitionCost,
      condition, location, isBookable, customValues,
    } = req.body;

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

    res.json(asset);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Asset not found' });
    next(err);
  }
});

// GET /api/assets/:id/history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
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

    const timeline = [
      ...allocations.map((a) => ({
        type: 'ALLOCATION',
        date: a.createdAt,
        status: a.status,
        holder: a.employee?.name ?? a.department?.name ?? 'Unknown',
        returnedAt: a.actualReturn,
        expectedReturn: a.expectedReturn,
        conditionNotes: a.conditionNotes,
      })),
      ...maintenance.map((m) => ({
        type: 'MAINTENANCE',
        date: m.createdAt,
        status: m.status,
        priority: m.priority,
        description: m.description,
        raisedBy: m.raisedBy?.name,
        resolvedAt: m.resolvedAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ assetTag: asset.tag, assetName: asset.name, timeline });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/:id/photo
router.post('/:id/photo', authenticate, requireAssetManager, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo file provided' });

    const photoUrl = `/uploads/${req.file.filename}`;
    const asset = await prisma.asset.update({
      where: { id: BigInt(req.params.id) },
      data: { photoUrl },
    });

    res.json({ message: 'Photo uploaded successfully', photoUrl, assetId: asset.id });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Asset not found' });
    next(err);
  }
});

module.exports = router;
