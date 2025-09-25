import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get meal plans for a mess facility
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { messFacilityId } = req.query;
    
    const where = {};
    if (messFacilityId) where.messFacilityId = messFacilityId;

    const mealPlans = await req.prisma.mealPlan.findMany({
      where,
      include: {
        dishes: {
          include: {
         dish:true
        }
        },
        messFacility: {
          select: { name: true }
        }
      },
      orderBy: [{ day: 'asc' }, { meal: 'asc' }]
    });

    res.json(mealPlans);
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update meal plan
router.post('/', authenticateToken, requireRole(['CHEF', 'ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    const { messFacilityIds, day, meal, dishes } = req.body;

    const createdPlans = [];

    // Create meal plan for each selected facility
    for (const messFacilityId of messFacilityIds) {
      // Get planned students from active subscriptions
      const plannedStudents = await req.prisma.subscription.count({
        where: {
          messFacilityId,
          status: 'ACTIVE',
          package: {
            mealsIncluded: {
              has: meal
            }
          }
        }
      });

      // Delete existing meal plan if it exists
      await req.prisma.mealPlan.deleteMany({
        where: {
          messFacilityId,
          day,
          meal
        }
      });

      // Create new meal plan with multiple dishes
      const mealPlan = await req.prisma.mealPlan.create({
        data: {
          messFacilityId,
          day,
          meal,
          plannedStudents,
          dishes: {
            create: dishes.map((dish) => ({
              dishId: dish.dishId,
              sequenceOrder: dish.sequenceOrder,
              isMainDish: dish.isMainDish
            }))
          }
        },
        include: {
          dishes: {
            include: {
              dish: {
                include: {
                  recipes: {
                    include: {
                      item: {
                        select: { name: true, unit: true }
                      }
                    }
                  }
                }
              }
            }
          },
          messFacility: {
            select: { name: true }
          }
        }
      });

      createdPlans.push(mealPlan);
    }

    res.json({
      message: `Created meal plans for ${createdPlans.length} facilities`,
      plans: createdPlans
    });
  } catch (error) {
    console.error('Create/Update meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete meal plan
router.delete('/:id', authenticateToken, requireRole(['CHEF', 'ADMIN', 'FNB_MANAGER']), async (req, res) => {
  try {
    await req.prisma.mealPlan.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;