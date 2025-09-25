import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/items/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Get all items with stock info
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await req.prisma.item.findMany({
      include: {
        category: true,
        vendor: true,
        unit: true,
        batches: {
          where: { qtyOnHand: { gt: 0 } }
        },
        alerts: {
          where: { status: 'OPEN' }
        }
      },
      orderBy: { name: 'asc' }
    });

    const itemsWithStock = items.map(item => {
      const totalStock = item.batches.reduce((sum, batch) => sum + batch.qtyOnHand, 0);
      const avgCost = item.batches.length > 0 
        ? item.batches.reduce((sum, batch) => sum + batch.unitCost * batch.qtyOnHand, 0) / totalStock
        : 0;

      return {
        ...item,
        totalStock,
        avgCost,
        hasAlerts: item.alerts.length > 0
      };
    });

    res.json(itemsWithStock);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new item
router.post('/', authenticateToken, requireRole(['ADMIN', 'STORE']), upload.single('image'), async (req, res) => {
  try {
    const itemData = { ...req.body };
    
    // Convert string numbers to actual numbers
    if (itemData.moq) itemData.moq = parseInt(itemData.moq);
    if (itemData.reorderPoint) itemData.reorderPoint = parseInt(itemData.reorderPoint);
    if (itemData.perishable) itemData.perishable = itemData.perishable === 'true';
    if (itemData.pointsValue) itemData.pointsValue = parseInt(itemData.pointsValue);

    // Add image URL if file was uploaded
    if (req.file) {
      itemData.imageUrl = `/uploads/items/${req.file.filename}`;
    }

    const item = await req.prisma.item.create({
      data: itemData,
      include: {
        category: true,
        vendor: true
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'STORE']), upload.single('image'), async (req, res) => {
  try {
    const itemData = { ...req.body };
    
    // Convert string numbers to actual numbers
    if (itemData.moq) itemData.moq = parseInt(itemData.moq);
    if (itemData.reorderPoint) itemData.reorderPoint = parseInt(itemData.reorderPoint);
    if (itemData.perishable) itemData.perishable = itemData.perishable === 'true';
        if (itemData.pointsValue) itemData.pointsValue = parseInt(itemData.pointsValue);

    // Add image URL if file was uploaded
    if (req.file) {
      itemData.imageUrl = `/uploads/items/${req.file.filename}`;
    }

    const item = await req.prisma.item.update({
      where: { id: req.params.id },
      data: itemData,
      include: {
        category: true,
        vendor: true
      }
    });

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete item
router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    await req.prisma.item.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category
router.post('/categories', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const category = await req.prisma.category.create({
      data: req.body
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category
router.delete('/categories/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    // Check if category has items
    const itemCount = await req.prisma.item.count({
      where: { categoryId: req.params.id }
    });

    if (itemCount > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing items' });
    }

    await req.prisma.category.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category
router.put('/categories/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const category = await req.prisma.category.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get item batches
router.get('/:id/batches', authenticateToken, async (req, res) => {
  try {
    const batches = await req.prisma.itemBatch.findMany({
      where: { 
        itemId: req.params.id,
        qtyOnHand: { gt: 0 }
      },
      orderBy: [
        { expDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(batches);
  } catch (error) {
    console.error('Get item batches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get item stock ledger
router.get('/:id/ledger', authenticateToken, async (req, res) => {
  try {
    const ledger = await req.prisma.stockLedger.findMany({
      where: { itemId: req.params.id },
      include: {
        user: {
          select: { name: true }
        },
        batch: {
          select: { batchNo: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(ledger);
  } catch (error) {
    console.error('Get item ledger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;