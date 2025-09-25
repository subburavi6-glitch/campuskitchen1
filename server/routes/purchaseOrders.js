import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all purchase orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, vendorId } = req.query;
    
    const where = {};
     if (status) {
      if (status.includes(',')) {
        // Multiple statuses: "OPEN,PARTIAL"
        where.status = {
          in: status.split(',').map(s => s.trim())
        };
      } else {
        // Single status
        where.status = status.trim();
      }
    }
    
    if (vendorId) where.vendorId = vendorId;

    const purchaseOrders = await req.prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: {
          select: { name: true }
        },
        creator: {
          select: { name: true }
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(purchaseOrders);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single purchase order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const purchaseOrder = await req.prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: { name: true }
        },
        creator: {
          select: { name: true }
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new purchase order
router.post('/', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    const { vendorId, items, notes } = req.body;

    // Generate PO number
    const lastPO = await req.prisma.purchaseOrder.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const poNumber = `PO${String((lastPO ? parseInt(lastPO.poNo.slice(2)) : 0) + 1).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.orderedQty * item.unitCost;
    });
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    const purchaseOrder = await req.prisma.purchaseOrder.create({
      data: {
        vendorId,
        poNo: poNumber,
        subtotal,
        tax,
        total,
        notes,
        createdBy: req.user.id,
        items: {
          create: items.map(item => ({
            itemId: item.itemId,
            orderedQty: item.orderedQty,
            unitCost: item.unitCost,
            taxRate: item.taxRate || 0
          }))
        }
      },
      include: {
        vendor: {
          select: { name: true }
        },
        creator: {
          select: { name: true }
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      }
    });

    res.status(201).json(purchaseOrder);
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update purchase order
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    const { vendorId, items, notes } = req.body;

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.orderedQty * item.unitCost;
    });
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    // Delete existing items
    await req.prisma.pOItem.deleteMany({
      where: { poId: req.params.id }
    });

    const purchaseOrder = await req.prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        vendorId,
        subtotal,
        tax,
        total,
        notes,
        items: {
          create: items.map(item => ({
            itemId: item.itemId,
            orderedQty: item.orderedQty,
            unitCost: item.unitCost,
            taxRate: item.taxRate || 0
          }))
        }
      },
      include: {
        vendor: {
          select: { name: true }
        },
        creator: {
          select: { name: true }
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      }
    });

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete purchase order
router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    await req.prisma.purchaseOrder.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/print', authenticateToken, async (req, res) => {
  try {
    const purchaseOrder = await req.prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: true,
        creator: {
          select: { name: true }
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Print purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;