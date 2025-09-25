import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sendPushNotification } from '../services/notificationService.js';

const router = express.Router();

// Helper: determine mealType by current time
function getCurrentMealType() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 7 && hour < 10) return 'BREAKFAST';
  if (hour >= 12 && hour < 15) return 'LUNCH';
  if (hour >= 16 && hour < 18) return 'SNACKS';
  if (hour >= 19 && hour < 21) return 'DINNER';
  return null;
}


router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { qrCode, deviceId } = req.body;
    const mealType = getCurrentMealType();

    if (!mealType) {
      return res.status(400).json({ error: 'Not meal time now' });
    }

    if (qrCode.startsWith('SUB-')) {
      const studentId = qrCode.substring(4);
      const student = await req.prisma.student.findUnique({
        where: { registerNumber: studentId }
      });

      if (student) {
        const today = new Date();
        const subscription = await req.prisma.subscription.findFirst({
          where: {
            studentId: student.id,
            startDate: { lte: today },
            endDate: { gte: today },
            status: 'ACTIVE',
            messFacilityId: student.messFacilityId ?? undefined
          }
        });

        if (!subscription) {
          return res.json({ valid: false, error: 'No active subscription found for student' });
        }

        const dayOfWeek = (today.getDay() === 0) ? 6 : today.getDay() - 1;
        const mealPlan = await req.prisma.mealPlan.findFirst({
          where: {
            messFacilityId: subscription.messFacilityId,
            day: dayOfWeek,
            meal: mealType
          }
        });

        if (!mealPlan) {
          return res.json({ valid: false, error: 'No meal plan available for this meal' });
        }

        const existingAttendance = await req.prisma.mealAttendance.findUnique({
          where: {
            studentId_mealPlanId: { studentId: student.id, mealPlanId: mealPlan.id }
          }
        });

        if (existingAttendance?.attended) {
          return res.json({ valid: false, error: 'Already served for this meal' });
        }

        await req.prisma.mealAttendance.create({
          data: {
            studentId: student.id,
            mealPlanId: mealPlan.id,
            attended: true,
            attendedAt: new Date(),
            scannerVerified: true,
            scannerDeviceId: deviceId
          }
        });

        await req.prisma.scannerLog.create({
          data: {
            deviceId,
            studentId: student.id,
            qrCodeScanned: studentId,
            scanResult: 'MESS_COUPON_VALID',
            mealType,
            accessGranted: true,
            studentName: student.name,
            studentPhotoUrl: student.photoUrl
          }
        });

        // Send push notification to student
        await sendPushNotification(student.id, 'Meal Served', `Your ${mealType.toLowerCase()} has been served.`);

        return res.json({
          valid: true,
          type: 'MESS_COUPON',
          message: 'Subscription valid, meal served',
          student: {
            name: student.name,
            registerNumber: student.registerNumber,
            photoUrl: student.photoUrl
          },
          mealType
        });
      }
    } else {
      const orderNumber = qrCode.substring(6);
      const order = await req.prisma.order.findUnique({
        where: { orderNumber },
        include: {
          student: {
            select: { name: true, registerNumber: true, photoUrl: true }
          },
          orderItems: {
            include: {
              menuItem: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (order) {
        if (order.status === 'SERVED') {
          return res.json({ valid: false, error: 'Order already served' });
        }

        await req.prisma.order.update({
          where: { id: order.id },
          data: { status: 'SERVED', servedAt: new Date() }
        });

        await req.prisma.scannerLog.create({
          data: {
            deviceId,
            studentId: order.student ? order.student.id : null,
            qrCodeScanned: orderNumber,
            scanResult: 'ORDER_VALID',
            mealType: order.mealType,
            accessGranted: true,
            studentName: order.student?.name,
            studentPhotoUrl: order.student?.photoUrl
          }
        });

        // Send push notification to student
        if (order.student) {
          await sendPushNotification(order.student.id, 'Order Served', `Your order ${order.orderNumber} has been served.`);
        }

        return res.json({
          valid: true,
          type: 'ORDER',
          message: 'Order validated and marked served',
          order: {
            orderNumber: order.orderNumber,
            studentName: order.student?.name,
            registerNumber: order.student?.registerNumber,
            photoUrl: order.student?.photoUrl,
            totalAmount: order.totalAmount,
            mealType: order.mealType,
            items: order.orderItems.map(i => ({
              name: i.menuItem.name,
              quantity: i.quantity
            }))
          }
        });
      }
    }

    return res.json({ valid: false, error: 'Invalid QR or Order Number' });
  } catch (error) {
    console.error('QR scan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Recent scans with stats summary - MODIFIED to get only today's scans
router.get('/recent-scans', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Create date range for today only
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Start of today: 00:00:00

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999); // End of today: 23:59:59

    // Filter scans to only include today's records
    const scans = await req.prisma.scannerLog.findMany({
      where: {
        scannedAt: {
          gte: startOfDay,  // Greater than or equal to start of today
          lte: endOfDay     // Less than or equal to end of today
        }
      },
      orderBy: { scannedAt: 'desc' },
      take: parseInt(limit),
      include: { student: true }
    });

    const mealType = getCurrentMealType();
    const today = new Date();
    const dayOfWeek = (today.getDay() === 0) ? 6 : today.getDay() - 1;

    // Count active subscriptions expected to come
    const expectedCount = await req.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        startDate: { lte: today },
        endDate: { gte: today }
      }
    });

    // Count attended meals today
    const servedCount = await req.prisma.mealAttendance.count({
      where: {
        attended: true,
        mealPlan: {
          day: dayOfWeek,
          meal: mealType
        }
      }
    });

    return res.json({ 
      scans, 
      stats: { 
        expectedToCome: expectedCount, 
        served: servedCount, 
        mealType,
        totalScansToday: scans.length // Optional: add today's scan count
      } 
    });
  } catch (error) {
    console.error('Recent scans error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
