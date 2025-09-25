import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all GRNs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const grns = await req.prisma.gRN.findMany({
      include: {
        po: {
          include: {
            vendor: {
              select: { name: true }
            }
          }
        },
        receiver: {
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
      orderBy: { receivedAt: 'desc' }
    });

    res.json(grns);
  } catch (error) {
    console.error('Get GRNs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new GRN
router.post('/', authenticateToken, requireRole(['STORE']), async (req, res) => {
  try {
    const { poId, invoiceNo, items, notes } = req.body;

    // Generate GRN number
    const lastGRN = await req.prisma.gRN.findFirst({
      orderBy: { receivedAt: 'desc' }
    });
    const grnNumber = `GRN${String((lastGRN ? parseInt(lastGRN.grnNo.slice(3)) : 0) + 1).padStart(6, '0')}`;
    // Don't allow price changes in GRN - use PO prices

    const grn = await req.prisma.gRN.create({
      data: {
        poId,
        grnNo: grnNumber,
        invoiceNo,
        receivedBy: req.user.id,
        notes,
        items: {
          create: items.map(item => ({
            poItemId: item.poItemId,
            itemId: item.itemId,
            batchNo: item.batchNo,
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
            expDate: item.expDate ? new Date(item.expDate) : null,
            receivedQty: item.receivedQty,
            unitCost: item.unitCost
          }))
        }
      }
    });

    // Update stock batches and ledger
    for (const item of items) {
      // Create or update batch
      const existingBatch = await req.prisma.itemBatch.findUnique({
        where: {
          itemId_batchNo: {
            itemId: item.itemId,
            batchNo: item.batchNo
          }
        }
      });

      if (existingBatch) {
        await req.prisma.itemBatch.update({
          where: { id: existingBatch.id },
          data: {
            qtyOnHand: existingBatch.qtyOnHand + item.receivedQty
          }
        });
      } else {
        await req.prisma.itemBatch.create({
          data: {
            itemId: item.itemId,
            batchNo: item.batchNo,
            qtyOnHand: item.receivedQty,
            unitCost: item.unitCost,
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
            expDate: item.expDate ? new Date(item.expDate) : null
          }
        });
      }

      // Create stock ledger entry
      await req.prisma.stockLedger.create({
        data: {
          itemId: item.itemId,
          txnType: 'RECEIPT',
          qty: item.receivedQty,
          refType: 'GRN',
          refId: grn.id,
          createdBy: req.user.id
        }
      });

      // Update PO item received qty
      await req.prisma.pOItem.update({
        where: { id: item.poItemId },
        data: {
          receivedQty: {
            increment: item.receivedQty
          }
        }
      });
    }

    // Update PO status if fully received
    const poItems = await req.prisma.pOItem.findMany({
      where: { poId }
    });

    const allReceived = poItems.every(item => item.receivedQty >= item.orderedQty);
    const partiallyReceived = poItems.some(item => item.receivedQty > 0);

    if (allReceived) {
      await req.prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'CLOSED' }
      });
    } else if (partiallyReceived) {
      await req.prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'PARTIAL' }
      });
    }

    const fullGRN = await req.prisma.gRN.findUnique({
      where: { id: grn.id },
      include: {
        po: {
          include: {
            vendor: {
              select: { name: true }
            }
          }
        },
        receiver: {
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

    res.status(201).json(fullGRN);
  } catch (error) {
    console.error('Create GRN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Print GRN
router.get('/:id/print', authenticateToken, async (req, res) => {
  try {
    const grn = await req.prisma.gRN.findUnique({
      where: { id: req.params.id },
      include: {
        po: {
          include: {
            vendor: true
          }
        },
        receiver: {
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

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    res.json(grn);
  } catch (error) {
    console.error('Print GRN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;