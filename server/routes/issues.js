import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all issues
router.get('/', authenticateToken, async (req, res) => {
  try {
    const issues = await req.prisma.issue.findMany({
      include: {
        indent: {
          include: {
            requester: {
              select: { name: true }
            }
          }
        },
        issuer: {
          select: { name: true }
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            },
            batch: {
              select: { batchNo: true }
            }
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });

    res.json(issues);
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new issue (from approved indent)
router.post('/', authenticateToken, requireRole(['STORE']), async (req, res) => {
  try {
    const { indentId, items } = req.body; // items: [{ itemId, batchId, qty }]

    const issue = await req.prisma.issue.create({
      data: {
        indentId,
        issuedBy: req.user.id,
        items: {
          create: items.map(item => ({
            itemId: item.itemId,
            batchId: item.batchId,
            qty: item.qty
          }))
        }
      }
    });

    // Update stock and ledger using FIFO
    for (const item of items) {
      // Reduce batch quantity
      await req.prisma.itemBatch.update({
        where: { id: item.batchId },
        data: {
          qtyOnHand: {
            decrement: item.qty
          }
        }
      });

      // Create stock ledger entry
      await req.prisma.stockLedger.create({
        data: {
          itemId: item.itemId,
          batchId: item.batchId,
          txnType: 'ISSUE',
          qty: -item.qty,
          refType: 'ISSUE',
          refId: issue.id,
          createdBy: req.user.id
        }
      });

      // Update indent item issued qty
      await req.prisma.indentItem.updateMany({
        where: {
          indentId,
          itemId: item.itemId
        },
        data: {
          issuedQty: {
            increment: item.qty
          }
        }
      });
    }

    const fullIssue = await req.prisma.issue.findUnique({
      where: { id: issue.id },
      include: {
        indent: {
          include: {
            requester: {
              select: { name: true }
            }
          }
        },
        issuer: {
          select: { name: true }
        },
        items: {
          include: {
            item: {
              select: { name: true, unit: true }
            },
            batch: {
              select: { batchNo: true }
            }
          }
        }
      }
    });

    res.status(201).json(fullIssue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;