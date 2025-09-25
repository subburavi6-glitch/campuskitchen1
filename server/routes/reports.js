import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get today's mess overview - all facilities
router.get('/today-overview', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Get all mess facilities
    const messFacilities = await req.prisma.messFacility.findMany({
      where: { active: true }
    });

    const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const facilityReports = [];

    for (const facility of messFacilities) {
      const facilityReport = {
        id: facility.id,
        name: facility.name,
        location: facility.location,
        capacity: facility.capacity,
        meals: {}
      };

      for (const mealType of mealTypes) {
        // Get today's meal plan
        console.log({
          where: {
            messFacilityId: facility.id,
            meal: mealType,
            day: today.getDay()-1
          },
          include: {
            dishes: true,
            attendances: {
              where: {
                attendedAt: {
                  gte: startOfDay,
                  lte: endOfDay
                }
              }
            }
          }
        })
        const mealPlan = await req.prisma.mealPlan.findFirst({
          where: {
            messFacilityId: facility.id,
            meal: mealType,
            day: today.getDay()-1
          },
          include: {
            dishes: true,
            attendances: {
              where: {
                attendedAt: {
                  gte: startOfDay,
                  lte: endOfDay
                }
              }
            }
          }
        });

        // Get subscription meals served
        const subscriptionMeals = mealPlan ? mealPlan.attendances.filter(a => a.attended).length : 0;
      const totalPlanned = await req.prisma.subscription.count({
        where: {
          messFacilityId: facility.id,
          status: 'ACTIVE'
        }
      });

        // Get individual orders for this meal
        const orders = await req.prisma.order.findMany({
          where: {
            messFacilityId: facility.id,
            mealType: mealType,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: {
              in: ['CONFIRMED', 'PREPARED', 'SERVED']
            }
          },
          include: {
            orderItems: {
              include: {
                menuItem: true
              }
            }
          }
        });

        const totalOrders = orders.length;
        const totalOrderRevenue = orders
          .filter(order => order.status === 'SERVED')
          .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

        facilityReport.meals[mealType] = {
          dishName: mealPlan?.dish?.name || 'Not Planned',
          totalPlanned,
          subscriptionServed: subscriptionMeals,
          subscriptionPercentage: totalPlanned > 0 ? (subscriptionMeals / totalPlanned * 100).toFixed(1) : 0,
          totalOrders,
          orderRevenue: totalOrderRevenue,
          totalServed: subscriptionMeals + orders.filter(o => o.status === 'SERVED').length
        };
      }

      facilityReports.push(facilityReport);
    }

    res.json({
      date: today.toISOString().split('T')[0],
      facilities: facilityReports
    });

  } catch (error) {
    console.error('Today overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed mess facility report
router.get('/mess/:messId', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const { messId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get mess facility info
    const messFacility = await req.prisma.messFacility.findUnique({
      where: { id: messId },
      include: {
        packages: {
          include: {
            subscriptions: {
              where: {
                status: 'ACTIVE',
                startDate: { lte: end },
                endDate: { gte: start }
              }
            }
          }
        }
      }
    });

    if (!messFacility) {
      return res.status(404).json({ error: 'Mess facility not found' });
    }

    // Get meal attendance data
    const attendances = await req.prisma.mealAttendance.findMany({
      where: {
        attendedAt: { gte: start, lte: end },
        attended: true,
        mealPlan: {
          messFacilityId: messId
        }
      },
      include: {
        student: {
          select: { name: true, registerNumber: true, userType: true, department: true }
        },
        mealPlan: {
          include: {
            dishes:  {
              include :{
                dish:true
              }
             }
          }
        }
      }
    });

    // Get orders data
    const orders = await req.prisma.order.findMany({
      where: {
        messFacilityId: messId,
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: end }
      },
      include: {
        student: {
          select: { name: true, registerNumber: true, userType: true }
        },
        orderItems: {
          include: {
            menuItem: { select: { name: true, price: true } }
          }
        }
      },
       orderBy: { createdAt: 'desc' }
    });

    // Get ratings data
    const ratings = await req.prisma.mealRating.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        mealPlan: {
          messFacilityId: messId
        }
      },
      include: {
        student: {
          select: { name: true, registerNumber: true }
        },
        mealPlan: {
           include: {
            dishes:  {
              include :{
                dish:true
              }
             }
          }
        }
      }
    });

    // Calculate statistics
    const totalMealsServed = attendances.length;
    const totalOrders = orders.length;
    const servedOrders = orders.filter(o => o.status === 'SERVED').length;
    const totalRevenue = orders
      .filter(o => o.status === 'SERVED')
      .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    // Daily breakdown
    const dailyStats = {};
    const dateRange = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateRange.push(dateStr);
      dailyStats[dateStr] = {
        date: dateStr,
        subscriptionMeals: 0,
        orders: 0,
        revenue: 0,
        ratings: 0,
        avgRating: 0
      };
    }

    attendances.forEach(attendance => {
      const date = attendance.attendedAt.toISOString().split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].subscriptionMeals++;
      }
    });

    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].orders++;
        if (order.status === 'SERVED') {
          dailyStats[date].revenue += parseFloat(order.totalAmount);
        }
      }
    });

    ratings.forEach(rating => {
      const date = rating.createdAt.toISOString().split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].ratings++;
      }
    });

    // Calculate average ratings per day
    Object.keys(dailyStats).forEach(date => {
      const dayRatings = ratings.filter(r => 
        r.createdAt.toISOString().split('T')[0] === date
      );
      if (dayRatings.length > 0) {
        dailyStats[date].avgRating = dayRatings.reduce((sum, r) => sum + r.rating, 0) / dayRatings.length;
      }
    });

    // Meal type distribution
    const mealTypeStats = {};
    ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].forEach(mealType => {
      const mealAttendances = attendances.filter(a => a.mealPlan.meal === mealType).length;
      const mealOrders = orders.filter(o => o.mealType === mealType).length;
      mealTypeStats[mealType] = {
        mealType,
        subscriptions: mealAttendances,
        orders: mealOrders,
        total: mealAttendances + mealOrders
      };
    });

    // Most popular menu items from orders
    const itemStats = {};
    orders.forEach(order => {
      order.orderItems.forEach(item => {
        const itemName = item.menuItem.name;
        if (!itemStats[itemName]) {
          itemStats[itemName] = {
            name: itemName,
            quantity: 0,
            orders: 0,
            revenue: 0,
            unitPrice: parseFloat(item.unitPrice)
          };
        }
        itemStats[itemName].quantity += item.quantity;
        itemStats[itemName].orders++;
        itemStats[itemName].revenue += parseFloat(item.totalPrice);
      });
    });

    const popularItems = Object.values(itemStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Rating distribution
    const ratingDistribution = {};
    [1, 2, 3, 4, 5].forEach(rating => {
      ratingDistribution[rating] = ratings.filter(r => r.rating === rating).length;
    });

    // Dish ratings
    const dishRatings = {};
    ratings.forEach(rating => {
      const dishName = rating.mealPlan.dish.name;
      if (!dishRatings[dishName]) {
        dishRatings[dishName] = {
          name: dishName,
          ratings: [],
          count: 0,
          average: 0,
          mealType: rating.mealPlan.meal
        };
      }
      dishRatings[dishName].ratings.push(rating.rating);
      dishRatings[dishName].count++;
    });

    Object.values(dishRatings).forEach(dish => {
      dish.average = dish.ratings.reduce((sum, rating) => sum + rating, 0) / dish.count;
    });

    const topRatedDishes = Object.values(dishRatings)
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    const lowRatedDishes = Object.values(dishRatings)
      .sort((a, b) => a.average - b.average)
      .slice(0, 5);

    // Order status distribution
    const statusStats = {};
    orders.forEach(order => {
      statusStats[order.status] = (statusStats[order.status] || 0) + 1;
    });

    // Peak hours analysis
    const hourlyStats = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    // Active subscriptions
    const activeSubscriptions = messFacility.packages.reduce((sum, pkg) => 
      sum + pkg.subscriptions.length, 0
    );

    res.json({
      messFacility: {
        id: messFacility.id,
        name: messFacility.name,
        location: messFacility.location,
        capacity: messFacility.capacity,
        imageUrl: messFacility.imageUrl
      },
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      summary: {
        totalMealsServed,
        totalOrders,
        servedOrders,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? totalRevenue / servedOrders : 0,
        activeSubscriptions,
        totalRatings: ratings.length,
        averageRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0,
        satisfactionRate: ratings.length > 0 ? 
          ((ratingDistribution[4] || 0) + (ratingDistribution[5] || 0)) / ratings.length * 100 : 0
      },
      dailyStats: Object.values(dailyStats),
      mealTypeStats: Object.values(mealTypeStats),
      popularItems,
      orderStatusStats: Object.entries(statusStats).map(([status, count]) => ({
        status, count
      })),
      ratingDistribution: Object.entries(ratingDistribution).map(([rating, count]) => ({
        rating: parseInt(rating), count
      })),
      topRatedDishes,
      lowRatedDishes,
      hourlyOrderStats: Object.entries(hourlyStats).map(([hour, count]) => ({
        hour: parseInt(hour), count
      })),
      recentOrders: orders.slice(0, 20),
      recentRatings: ratings.slice(0, 20)
    });

  } catch (error) {
    console.error('Mess detailed report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive meal reports (existing)
router.get('/meals', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  // ... existing code
});

// Get order reports (existing) 
router.get('/orders', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  // ... existing code
});

// Get feedback reports (existing)
router.get('/feedback', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  // ... existing code
});

// Export reports
router.get('/export', authenticateToken, requireRole(['ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const { startDate, endDate, messFacilityId, type = 'comprehensive' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();
    
    let data = [];
    
    if (type === 'comprehensive') {
      // Get comprehensive data for export
      const attendances = await req.prisma.mealAttendance.findMany({
        where: {
          attendedAt: { gte: start, lte: end },
          attended: true,
          ...(messFacilityId && {
            mealPlan: { messFacilityId }
          })
        },
        include: {
          student: true,
          mealPlan: {
            include: {
              dish: true,
              messFacility: true
            }
          }
        }
      });

      const orders = await req.prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(messFacilityId && { messFacilityId })
        },
        include: {
          student: true,
          messFacility: true,
          orderItems: {
            include: {
              menuItem: true
            }
          }
        }
      });

      // Combine data for export
      data = [
        ...attendances.map(a => ({
          type: 'Subscription Meal',
          date: a.attendedAt.toISOString().split('T')[0],
          studentName: a.student.name,
          registerNumber: a.student.registerNumber,
          messFacility: a.mealPlan.messFacility.name,
          mealType: a.mealPlan.meal,
          dishName: a.mealPlan.dish.name,
          amount: 0,
          userType: a.student.userType
        })),
        ...orders.map(o => ({
          type: 'Individual Order',
          date: o.createdAt.toISOString().split('T')[0],
          studentName: o.student.name,
          registerNumber: o.student.registerNumber,
          messFacility: o.messFacility.name,
          mealType: o.mealType,
          dishName: o.orderItems.map(item => item.menuItem.name).join(', '),
          amount: parseFloat(o.totalAmount),
          userType: o.student.userType,
          orderStatus: o.status
        }))
      ];
    }

    res.json(data);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
