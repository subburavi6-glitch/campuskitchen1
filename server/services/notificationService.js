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

// Send meal attendance reminders at 3 PM daily
cron.schedule('0 15 * * *', async () => {
  try {
    console.log('Sending meal attendance reminders...');
    
    const settings = await prisma.mealAttendanceSettings.findFirst();
    const reminderStartTime = settings?.reminderStartTime || '15:00';
    const reminderEndTime = settings?.reminderEndTime || '22:00';
    const isMandatory = settings?.isMandatory || false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    // Only send if within reminder window
    if (currentTime < reminderStartTime || currentTime > reminderEndTime) {
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const dayOfWeek = tomorrow.getDay() === 0 ? 6 : tomorrow.getDay() - 1;

    // Get all active hosteler students
    const students = await prisma.student.findMany({
      where: {
        isHosteler: true,
        subscriptions: {
          some: {
            status: 'ACTIVE',
            startDate: { lte: tomorrow },
            endDate: { gte: tomorrow }
          }
        }
      },
      include: {
        subscriptions: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: tomorrow },
            endDate: { gte: tomorrow }
          },
          include: {
            package: true,
            messFacility: true
          }
        }
      }
    });

    for (const student of students) {
      // Check if reminder already sent today
      const existingReminder = await prisma.mealAttendanceReminder.findUnique({
        where: {
          studentId_reminderDate: {
            studentId: student.id,
            reminderDate: tomorrowDate
          }
        }
      });

      if (existingReminder && existingReminder.completed) continue;

      // Get tomorrow's meal plans for student's mess facilities
      const messFacilityIds = student.subscriptions.map(s => s.messFacilityId);
      const mealPlans = await prisma.mealPlan.findMany({
        where: {
          messFacilityId: { in: messFacilityIds },
          day: dayOfWeek
        },
        include: {
          dishes: {
            include: {
              dish: true
            }
          }
        }
      });

      if (mealPlans.length === 0) continue;

      // Check which meals need attendance marking
      const pendingMeals = [];
      for (const mealPlan of mealPlans) {
        const hasSubscription = student.subscriptions.some(s => 
          s.messFacilityId === mealPlan.messFacilityId && 
          s.package.mealsIncluded.includes(mealPlan.meal)
        );

        if (!hasSubscription) continue;

        const attendanceRecord = await prisma.mealAttendance.findUnique({
          where: {
            studentId_mealPlanId: {
              studentId: student.id,
              mealPlanId: mealPlan.id
            }
          }
        });

        if (!attendanceRecord || !attendanceRecord.markedAt) {
          pendingMeals.push(mealPlan.meal);
        }
      }

      if (pendingMeals.length === 0) continue;

      // Create or update reminder record
      await prisma.mealAttendanceReminder.upsert({
        where: {
          studentId_reminderDate: {
            studentId: student.id,
            reminderDate: tomorrowDate
          }
        },
        update: {
          mealsPending: pendingMeals,
          reminderSentAt: new Date()
        },
        create: {
          studentId: student.id,
          reminderDate: tomorrowDate,
          mealsPending: pendingMeals,
          reminderSentAt: new Date()
        }
      });

      // Create notification
      const notificationTitle = isMandatory 
        ? 'Mark Tomorrow\'s Meal Attendance (Required)'
        : 'Mark Tomorrow\'s Meal Attendance';
      
      const notificationMessage = `Please mark your attendance for tomorrow's meals: ${pendingMeals.join(', ')}. ${
        isMandatory ? 'This is mandatory for mess entry.' : 'This helps us plan better.'
      }`;

      await prisma.notification.create({
        data: {
          studentId: student.id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'meal_attendance'
        }
      });

      // Send push notification
      await sendPushNotification(
        student.id,
        notificationTitle,
        notificationMessage
      );
    }
  } catch (error) {
    console.error('Meal attendance reminder cron error:', error);
  }
});

// Close meal attendance marking at 11 PM
cron.schedule('0 23 * * *', async () => {
  try {
    console.log('Closing meal attendance marking for today...');
    
    // This is handled by time check in the API, but we can log it
    console.log('Meal attendance marking window closed at 11 PM');
  } catch (error) {
    console.error('Meal attendance close cron error:', error);
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