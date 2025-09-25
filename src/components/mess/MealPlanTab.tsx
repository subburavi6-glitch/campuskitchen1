import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Edit, Trash2, ChefHat, Clock, Users, Eye } from 'lucide-react';
import api from '../../utils/api';
import Modal from '../Modal';
import toast from 'react-hot-toast';

interface MealPlan {
  id: string;
  day: number;
  meal: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  plannedStudents: number;
  dishes: Array<{
    id: string;
    mealPlanId: string;
    dishId: string;
    sequenceOrder: number;
    isMainDish: boolean;
    dish: {
      id: string;
      name: string;
      imageUrl?: string | null;
      category?: string;
      costPer5Students?: string;
    };
  }>;
}

interface MealPlanTabProps {
  facilityId: string;
  viewOnly?: boolean;
}

const mealColors = {
  BREAKFAST: 'bg-orange-100 text-orange-800 border-orange-200',
  LUNCH: 'bg-green-100 text-green-800 border-green-200',
  SNACKS: 'bg-purple-100 text-purple-800 border-purple-200',
  DINNER: 'bg-blue-100 text-blue-800 border-blue-200',
};

const mealTimes = {
  BREAKFAST: '7:30 AM - 9:30 AM',
  LUNCH: '12:00 PM - 2:00 PM',
  SNACKS: '4:00 PM - 5:30 PM',
  DINNER: '7:00 PM - 9:00 PM',
};

const MealPlanTab: React.FC<MealPlanTabProps> = ({ facilityId, viewOnly = false }) => {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMealPlans();
  }, [facilityId]);

  const fetchMealPlans = async () => {
    try {
      const response = await api.get('/meal-plans', {
        params: { messFacilityId: facilityId }
      });
      setMealPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex];
  };

  const getMealPlan = (day: number, meal: string) => {
    return mealPlans.find(plan => plan.day === day && plan.meal === meal);
  };

  const meals = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Calendar Grid */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-8 gap-0">
          {/* Header */}
          <div className="bg-gray-50 p-4 font-medium text-gray-900 border-b border-r">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <span>Meal / Day</span>
            </div>
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <div key={day} className="bg-gray-50 p-4 text-center border-b border-r">
              <div className="font-medium text-gray-900">{getDayName(day)}</div>
              <div className="text-sm text-gray-500">Day {day}</div>
            </div>
          ))}

          {/* Meal Rows */}
          {meals.map(meal => (
            <React.Fragment key={meal}>
              <div className="bg-gray-50 p-4 font-medium text-gray-900 border-b border-r">
                <div className="flex flex-col items-start space-y-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${mealColors[meal as keyof typeof mealColors]}`}>
                    {meal}
                  </span>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock size={12} className="mr-1" />
                    <span>{mealTimes[meal as keyof typeof mealTimes]}</span>
                  </div>
                </div>
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const plan = getMealPlan(day, meal);
                return (
                  <div
                    key={`${day}-${meal}`}
                    className="p-4 border-b border-r min-h-[140px] hover:bg-gray-50 transition-colors group"
                  >
                    {plan && plan.dishes && plan.dishes.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {plan.dishes.map((dishItem, idx) => (
                              <div key={idx} className="mb-2">
                                <h4 className="font-medium text-gray-900 text-sm mb-1">
                                  {dishItem.dish.name}
                                </h4>
                                {dishItem.dish.category && (
                                  <p className="text-xs text-gray-500 mb-2">{dishItem.dish.category}</p>
                                )}
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="flex items-center text-xs text-blue-600">
                                    <Users size={12} className="mr-1" />
                                    <span>{plan.plannedStudents}</span>
                                  </div>
                                  {dishItem.isMainDish && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Main</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      !viewOnly && (
                        <div className="flex items-center justify-center h-full text-gray-400 group-hover:text-gray-600">
                          <div className="text-center">
                            <Plus size={24} className="mx-auto mb-2" />
                            <span className="text-xs">Add Meal Plan</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {viewOnly && mealPlans.length === 0 && (
        <div className="text-center py-8">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No meal plans found</h3>
          <p className="text-gray-500">No meal plans have been created for this facility yet.</p>
        </div>
      )}
    </div>
  );
};

export default MealPlanTab;