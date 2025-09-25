import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all active alerts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const alerts = await req.prisma.alert.findMany({
      where: { status: 'OPEN' },
      include: {
        item: {
          include: {
            batches: {
              where: { qtyOnHand: { gt: 0 } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate stock alerts
router.post('/generate-stock-alerts', authenticateToken, requireRole(['ADMIN', 'STORE']), async (req, res) => {
  try {
    const items = await req.prisma.item.findMany({
      include: {
        batches: {
          where: { qtyOnHand: { gt: 0 } }
        }
      }
    });

    const alertsToCreate = [];

    for (const item of items) {
      const totalStock = item.batches.reduce((sum, batch) => sum + batch.qtyOnHand, 0);
      
      // Check for low stock/MOQ alerts
      if (totalStock <= item.reorderPoint) {
        const existingAlert = await req.prisma.alert.findFirst({
          where: {
            itemId: item.id,
            type: 'LOW_STOCK',
            status: 'OPEN'
          }
        });

        if (!existingAlert) {
          alertsToCreate.push({
            itemId: item.id,
            type: 'LOW_STOCK',
            message: `${item.name} stock is below reorder point (${totalStock} ${item.unit} remaining)`
          });
        }
      }

      // Check for expiring items
      const expiringBatches = item.batches.filter(batch => {
        if (!batch.expDate) return false;
        const daysUntilExpiry = (batch.expDate - new Date()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
      });

      for (const batch of expiringBatches) {
        const existingAlert = await req.prisma.alert.findFirst({
          where: {
            itemId: item.id,
            type: 'EXPIRY',
            status: 'OPEN'
          }
        });

        if (!existingAlert) {
          alertsToCreate.push({
            itemId: item.id,
            type: 'EXPIRY',
            message: `${item.name} (Batch: ${batch.batchNo}) expires on ${batch.expDate.toDateString()}`
          });
        }
      }
    }

    if (alertsToCreate.length > 0) {
      await req.prisma.alert.createMany({
        data: alertsToCreate
      });
    }

    res.json({ message: `Generated ${alertsToCreate.length} alerts` });
  } catch (error) {
    console.error('Generate alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dismiss alert
router.post('/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const alert = await req.prisma.alert.update({
      where: { id: req.params.id },
      data: { status: 'DISMISSED' }
    });

    res.json(alert);
  } catch (error) {
    console.error('Dismiss alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;