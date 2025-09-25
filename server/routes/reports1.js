import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get comprehensive meal reports
router.get('/meals', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const { startDate, endDate, messFacilityId } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.attendedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get meal attendance data
    const attendances = await req.prisma.mealAttendance.findMany({
      where: {
        ...where,
        attended: true
      },
      include: {
        student: {
          select: { name: true, registerNumber: true, userType: true, department: true }
        },
        mealPlan: {
          include: {
            dish: { select: { name: true } },
            messFacility: { select: { name: true } }
          }
        }
      }
    });

    // Get order data
    const orders = await req.prisma.order.findMany({
      where: {
        status: 'SERVED',
        ...(startDate && endDate && {
          servedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }),
        ...(messFacilityId && { messFacilityId })
      },
      include: {
        student: {
          select: { name: true, registerNumber: true, userType: true }
        },
        messFacility: {
          select: { name: true }
        },
        orderItems: true,
      }
    });

    // Calculate statistics
    const totalMealsServed = attendances.length + orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    
    // Daily breakdown
    const dailyStats = {};
    attendances.forEach(attendance => {
      const date = attendance.attendedAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { subscription: 0, orders: 0, revenue: 0 };
      }
      dailyStats[date].subscription++;
    });

    orders.forEach(order => {
      const date = order.servedAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { subscription: 0, orders: 0, revenue: 0 };
      }
      dailyStats[date].orders++;
      dailyStats[date].revenue += parseFloat(order.totalAmount);
    });

    // Meal type distribution
    const mealTypeStats = {};
    attendances.forEach(attendance => {
      const mealType = attendance.mealPlan.meal;
      mealTypeStats[mealType] = (mealTypeStats[mealType] || 0) + 1;
    });

    orders.forEach(order => {
      const mealType = order.mealType;
      mealTypeStats[mealType] = (mealTypeStats[mealType] || 0) + 1;
    });

    // User type distribution
    const userTypeStats = {};
    [...attendances, ...orders].forEach(record => {
      const userType = record.student.userType;
      userTypeStats[userType] = (userTypeStats[userType] || 0) + 1;
    });

    res.json({
      summary: {
        totalMealsServed,
        totalRevenue,
        subscriptionMeals: attendances.length,
        individualOrders: orders.length,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
      },
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
        total: stats.subscription + stats.orders
      })),
      mealTypeStats: Object.entries(mealTypeStats).map(([type, count]) => ({
        mealType: type,
        count
      })),
      userTypeStats: Object.entries(userTypeStats).map(([type, count]) => ({
        userType: type,
        count
      })),
      recentAttendances: attendances.slice(-20),
      recentOrders: orders.slice(-20)
    });
  } catch (error) {
    console.error('Get meal reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order reports
router.get('/orders', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const { startDate, endDate, messFacilityId, status } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (messFacilityId) where.messFacilityId = messFacilityId;
    if (status) where.status = status;

    const orders = await req.prisma.order.findMany({
      where,
      include: {
        student: {
          select: { name: true, registerNumber: true, userType: true, department: true }
        },
        messFacility: {
          select: { name: true }
        },
         orderItems: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(order => order.status === 'SERVED')
      .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    
    const statusStats = {};
    orders.forEach(order => {
      statusStats[order.status] = (statusStats[order.status] || 0) + 1;
    });

    const mealTypeStats = {};
  

    const popularItems = [];

    res.json({
      summary: {
        totalOrders,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        completionRate: totalOrders > 0 ? (statusStats['SERVED'] || 0) / totalOrders * 100 : 0
      },
      orders,
      statusStats: Object.entries(statusStats).map(([status, count]) => ({
        status,
        count
      })),
      mealTypeStats: Object.entries(mealTypeStats).map(([type, count]) => ({
        mealType: type,
        count
      })),
      popularItems
    });
  } catch (error) {
    console.error('Get order reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback reports
router.get('/feedback', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const { startDate, endDate, messFacilityId } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const ratings = await req.prisma.mealRating.findMany({
      where,
      include: {
        student: {
          select: { name: true, registerNumber: true, userType: true }
        },
        mealPlan: {
          include: {
            dish: { select: { name: true } },
            messFacility: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter by mess facility if specified
    const filteredRatings = messFacilityId 
      ? ratings.filter(rating => rating.mealPlan.messFacility.id === messFacilityId)
      : ratings;

    // Calculate statistics
    const totalRatings = filteredRatings.length;
    const averageRating = totalRatings > 0 
      ? filteredRatings.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings
      : 0;

    // Rating distribution
    const ratingDistribution = {};
    filteredRatings.forEach(rating => {
      ratingDistribution[rating.rating] = (ratingDistribution[rating.rating] || 0) + 1;
    });

    // Dish ratings
    const dishRatings = {};
    filteredRatings.forEach(rating => {
      const dishName = rating.mealPlan.dish.name;
      if (!dishRatings[dishName]) {
        dishRatings[dishName] = { ratings: [], count: 0, average: 0 };
      }
      dishRatings[dishName].ratings.push(rating.rating);
      dishRatings[dishName].count++;
    });

    Object.keys(dishRatings).forEach(dishName => {
      const dish = dishRatings[dishName];
      dish.average = dish.ratings.reduce((sum, rating) => sum + rating, 0) / dish.count;
    });

    const topRatedDishes = Object.entries(dishRatings)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    const lowRatedDishes = Object.entries(dishRatings)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.average - b.average)
      .slice(0, 5);

    res.json({
      summary: {
        totalRatings,
        averageRating,
        satisfactionRate: totalRatings > 0 ? ((ratingDistribution[4] || 0) + (ratingDistribution[5] || 0)) / totalRatings * 100 : 0
      },
      ratingDistribution: Object.entries(ratingDistribution).map(([rating, count]) => ({
        rating: parseInt(rating),
        count
      })),
      topRatedDishes,
      lowRatedDishes,
      recentFeedback: filteredRatings.slice(0, 20)
    });
  } catch (error) {
    console.error('Get feedback reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;