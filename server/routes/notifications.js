import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Send rating request notifications (called by cron job)
router.post('/send-rating-requests', authenticateToken, async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Find meal attendances from 30 minutes ago that haven't been rated
    const attendances = await req.prisma.mealAttendance.findMany({
      where: {
        attended: true,
        attendedAt: {
          gte: thirtyMinutesAgo,
          lte: new Date(Date.now() - 25 * 60 * 1000) // 25-30 minutes ago
        }
      },
      include: {
        student: {
          select: { id: true, name: true }
        },
        mealPlan: {
          include: {
            dish: {
              select: { name: true }
            }
          }
        }
      }
    });

    let notificationsSent = 0;

    for (const attendance of attendances) {
      // Check if rating already exists
      const existingRating = await req.prisma.mealRating.findUnique({
        where: {
          studentId_mealPlanId: {
            studentId: attendance.studentId,
            mealPlanId: attendance.mealPlanId
          }
        }
      });

      if (existingRating) continue;

      // Check if rating request already sent
      const existingRequest = await req.prisma.ratingRequest.findUnique({
        where: {
          studentId_mealPlanId: {
            studentId: attendance.studentId,
            mealPlanId: attendance.mealPlanId
          }
        }
      });

      if (existingRequest) continue;

      // Create rating request record
      await req.prisma.ratingRequest.create({
        data: {
          studentId: attendance.studentId,
          mealPlanId: attendance.mealPlanId,
          notificationSentAt: new Date()
        }
      });

      // Create notification
      await req.prisma.notification.create({
        data: {
          studentId: attendance.studentId,
          title: 'Rate Your Meal',
          message: `How was your ${attendance.mealPlan.meal.toLowerCase()}? Please rate "${attendance.mealPlan.dish.name}" to help us improve.`,
          type: 'rating'
        }
      });

      // Send push notification
      await sendPushNotification(
        attendance.studentId,
        'Rate Your Meal',
        `How was your ${attendance.mealPlan.meal.toLowerCase()}? Please rate "${attendance.mealPlan.dish.name}".`,
        req.prisma
      );

      notificationsSent++;
    }

    res.json({ 
      message: `Sent ${notificationsSent} rating request notifications`,
      count: notificationsSent 
    });
  } catch (error) {
    console.error('Send rating requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send attendance confirmation notifications (for next day)
router.post('/send-attendance-requests', authenticateToken, async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();

    // Get tomorrow's meal plans
    const mealPlans = await req.prisma.mealPlan.findMany({
      where: {
        day: dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to Monday = 0 format
      },
      include: {
        dish: {
          select: { name: true }
        }
      }
    });

    // Get all active subscribers
    const activeSubscriptions = await req.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: tomorrow },
        endDate: { gte: tomorrow }
      },
      include: {
        student: {
          select: { id: true, name: true }
        }
      }
    });

    let notificationsSent = 0;

    for (const subscription of activeSubscriptions) {
      for (const mealPlan of mealPlans) {
        // Check if student already set attendance preference
        const existingAttendance = await req.prisma.mealAttendance.findUnique({
          where: {
            studentId_mealPlanId: {
              studentId: subscription.studentId,
              mealPlanId: mealPlan.id
            }
          }
        });

        if (existingAttendance && existingAttendance.willAttend !== null) continue;

        // Create notification
        await req.prisma.notification.create({
          data: {
            studentId: subscription.studentId,
            title: 'Confirm Tomorrow\'s Attendance',
            message: `Will you be attending ${mealPlan.meal.toLowerCase()} tomorrow? Dish: ${mealPlan.dish.name}`,
            type: 'attendance'
          }
        });

        // Send push notification
        await sendPushNotification(
          subscription.studentId,
          'Confirm Tomorrow\'s Attendance',
          `Will you be attending ${mealPlan.meal.toLowerCase()} tomorrow?`,
          req.prisma
        );

        notificationsSent++;
      }
    }

    res.json({ 
      message: `Sent ${notificationsSent} attendance confirmation notifications`,
      count: notificationsSent 
    });
  } catch (error) {
    console.error('Send attendance requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register push token
router.post('/register-push-token', authenticateToken, async (req, res) => {
  try {
    const { token, platform } = req.body;

    await req.prisma.pushToken.upsert({
      where: {
        studentId_token: {
          studentId: req.user.studentId,
          token
        }
      },
      update: {
        platform,
        active: true
      },
      create: {
        studentId: req.user.studentId,
        token,
        platform,
        active: true
      }
    });

    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to send push notifications
async function sendPushNotification(studentId, title, message, prisma) {
  try {
    const pushTokens = await prisma.pushToken.findMany({
      where: {
        studentId,
        active: true
      }
    });

    // In production, integrate with Expo Push Notifications
    for (const tokenRecord of pushTokens) {
      console.log(`Sending push notification to ${tokenRecord.token}:`, { title, message });
      
      // Here you would integrate with Expo Push Notifications API
      // const response = await fetch('https://exp.host/--/api/v2/push/send', {
      //   method: 'POST',
      //   headers: {
      //     'Accept': 'application/json',
      //     'Accept-encoding': 'gzip, deflate',
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     to: tokenRecord.token,
      //     title,
      //     body: message,
      //     data: { type: 'rating_request' }
      //   })
      // });
    }
  } catch (error) {
    console.error('Send push notification error:', error);
// Handle push notification clicks with deep linking
router.post('/handle-notification-click', authenticateToken1, async (req, res) => {
  try {
    const { notificationId, notificationType, relatedId } = req.body;

    // Mark notification as read
    if (notificationId) {
      await req.prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
      });
    }
  }
    // Return deep link information based on notification type
    let deepLink = { screen: 'Home', params: {} };

    switch (notificationType) {
      case 'order':
        deepLink = { screen: 'OrderHistory', params: { orderId: relatedId } };
        break;
      case 'meal_attendance':
        deepLink = { screen: 'MealPlan', params: { date: new Date().toISOString().split('T')[0] } };
        break;
      case 'rating':
        if (relatedId) {
          const mealPlan = await req.prisma.mealPlan.findUnique({
            where: { id: relatedId }
          });
          deepLink = { screen: 'Rating', params: { mealPlanId: relatedId } };
        }
        break;
      case 'subscription':
        deepLink = { screen: 'Subscription', params: {} };
        break;
      default:
        deepLink = { screen: 'Notifications', params: {} };
    }
}
    res.json({ deepLink });
  } catch (error) {
    console.error('Handle notification click error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;