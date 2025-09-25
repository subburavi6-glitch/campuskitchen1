import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Dashboard overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // Total items
    const totalItems = await req.prisma.item.count();

    // Low stock alerts
    const lowStockAlerts = await req.prisma.alert.count({
      where: { 
        status: 'OPEN',
        type: { in: ['LOW_STOCK', 'MOQ'] }
      }
    });

    // Pending indents
    const pendingIndents = await req.prisma.indent.count({
      where: { status: 'PENDING' }
    });

    // Open purchase orders
    const openPOs = await req.prisma.purchaseOrder.count({
      where: { status: { in: ['OPEN', 'PARTIAL'] } }
    });

    // Recent activities (last 10)
    const recentActivities = await req.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    // Expiring items (next 7 days)
    const expiringItems = await req.prisma.itemBatch.findMany({
      where: {
        expDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        qtyOnHand: { gt: 0 }
      },
      include: {
        item: {
          select: { name: true, unit: true }
        }
      },
      orderBy: { expDate: 'asc' }
    });

    // Top items by value
    const topItemsByValue = await req.prisma.itemBatch.findMany({
      where: { qtyOnHand: { gt: 0 } },
      include: {
        item: {
          select: { name: true, unit: true }
        }
      },
      take: 5
    });

    const topItems = topItemsByValue.map(batch => ({
      name: batch.item.name,
      unit: batch.item.unit,
      qty: batch.qtyOnHand,
      value: batch.qtyOnHand * batch.unitCost,
      unitCost: batch.unitCost
    })).sort((a, b) => b.value - a.value);

    res.json({
      stats: {
        totalItems,
        lowStockAlerts,
        pendingIndents,
        openPOs
      },
      recentActivities: recentActivities.map(activity => ({
        id: activity.id,
        action: activity.action,
        entity: activity.entity,
        userName: activity.user.name,
        createdAt: activity.createdAt
      })),
      expiringItems: expiringItems.map(batch => ({
        itemName: batch.item.name,
        batchNo: batch.batchNo,
        qty: batch.qtyOnHand,
        unit: batch.item.unit,
        expDate: batch.expDate
      })),
      topItems
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stock value analysis
router.get('/stock-analysis', authenticateToken, async (req, res) => {
  try {
    const stockAnalysis = await req.prisma.itemBatch.findMany({
      where: { qtyOnHand: { gt: 0 } },
      include: {
        item: {
          include: {
            category: true,
            unit: true
          }
        }
      }
    });

    const categoryWiseStock = stockAnalysis.reduce((acc, batch) => {
      const category = batch.item.category.name;
      if (!acc[category]) {
        acc[category] = { value: 0, qty: 0 };
      }
      acc[category].value += batch.qtyOnHand * batch.unitCost;
      acc[category].qty += batch.qtyOnHand;
      return acc;
    }, {});

    const totalStockValue = Object.values(categoryWiseStock)
      .reduce((sum, cat) => sum + cat.value, 0);

    res.json({
      categoryWiseStock,
      totalStockValue,
      totalItems: stockAnalysis.length
    });
  } catch (error) {
    console.error('Stock analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;