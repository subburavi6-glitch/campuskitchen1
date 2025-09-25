import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all vendors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const vendors = await req.prisma.vendor.findMany({
      include: {
        category: {
          select: { name: true }
        },
        _count: {
          select: {
            items: true,
            purchaseOrders: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new vendor
router.post('/', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    const vendor = await req.prisma.vendor.create({
      data: req.body
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vendor
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    const vendor = await req.prisma.vendor.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(vendor);
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vendor
router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    await req.prisma.vendor.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;