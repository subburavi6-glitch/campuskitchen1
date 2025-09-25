import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Send rating requests 30 minutes after meal attendance
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('Checking for rating requests...');
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const twentyFiveMinutesAgo = new Date(Date.now() - 25 * 60 * 1000);
    
    // Find meal attendances from 30 minutes ago that haven't been rated
    const attendances = await prisma.mealAttendance.findMany({
      where: {
        attended: true,
        attendedAt: {
          gte: thirtyMinutesAgo,
          lte: twentyFiveMinutesAgo
        }
      },
      include: {
        student: {
          select: { id: true, name: true }
        },
        mealPlan: {
          include: {
            dishes: {
              select: { dish: true }
            }
          }
        }
      }
    });

    for (const attendance of attendances) {
      // Check if rating already exists
      const existingRating = await prisma.mealRating.findUnique({
        where: {
          studentId_mealPlanId: {
            studentId: attendance.studentId,
            mealPlanId: attendance.mealPlanId
          }
        }
      });

      if (existingRating) continue;

      // Check if rating request already sent
      const existingRequest = await prisma.ratingRequest.findUnique({
        where: {
          studentId_mealPlanId: {
            studentId: attendance.studentId,
            mealPlanId: attendance.mealPlanId
          }
        }
      });

      if (existingRequest) continue;

      // Create rating request record
      await prisma.ratingRequest.create({
        data: {
          studentId: attendance.studentId,
          mealPlanId: attendance.mealPlanId,
          notificationSentAt: new Date()
        }
      });

      // Create notification
      await prisma.notification.create({
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
        `How was your ${attendance.mealPlan.meal.toLowerCase()}? Please rate "${attendance.mealPlan.dish.name}".`
      );
    }
  } catch (error) {
    console.error('Rating request cron error:', error);
  }
});

// Send attendance confirmation requests at 2 PM for next day
cron.schedule('0 14 * * *', async () => {
  try {
    console.log('Sending attendance confirmation requests...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();

    // Get tomorrow's meal plans
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        day: dayOfWeek === 0 ? 6 : dayOfWeek - 1
      },
      include: {
        dish: {
          select: { name: true }
        }
      }
    });

    // Get all active subscribers
    const activeSubscriptions = await prisma.subscription.findMany({
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

    for (const subscription of activeSubscriptions) {
      for (const mealPlan of mealPlans) {
        // Check if student already set attendance preference
        const existingAttendance = await prisma.mealAttendance.findUnique({
          where: {
            studentId_mealPlanId: {
              studentId: subscription.studentId,
              mealPlanId: mealPlan.id
            }
          }
        });

        if (existingAttendance && existingAttendance.willAttend !== null) continue;

        // Create notification
        await prisma.notification.create({
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
          `Will you be attending ${mealPlan.meal.toLowerCase()} tomorrow?`
        );
      }
    }
  } catch (error) {
    console.error('Attendance confirmation cron error:', error);
  }
});

// Check for expiring subscriptions daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Checking for expiring subscriptions...');
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: threeDaysFromNow,
          gte: new Date()
        }
      },
      include: {
        student: {
          select: { id: true, name: true }
        },
        package: {
          select: { name: true }
        }
      }
    });

    for (const subscription of expiringSubscriptions) {
      const daysRemaining = Math.ceil(
        (new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      await prisma.notification.create({
        data: {
          studentId: subscription.studentId,
          title: 'Subscription Expiring Soon',
          message: `Your ${subscription.package.name} subscription expires in ${daysRemaining} days. Renew now to continue service.`,
          type: 'subscription'
        }
      });

      await sendPushNotification(
        subscription.studentId,
        'Subscription Expiring Soon',
        `Your subscription expires in ${daysRemaining} days. Renew now!`
      );
    }
  } catch (error) {
    console.error('Expiring subscriptions cron error:', error);
  }
});

// Helper function to send push notifications
async function sendPushNotification(studentId, title, message) {
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
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: tokenRecord.token,
          title,
          body: message,
          data: { type: 'rating_request' }
        })
      });
    }
  } catch (error) {
    console.error('Send push notification error:', error);
  }
}

export { sendPushNotification };