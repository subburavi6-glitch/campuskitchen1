import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChefHat as Chef, Plus, Edit, Trash2, Eye, Building } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import MealPlanForm from '../components/forms/MealPlanForm';
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert';

interface MealPlan {
  id: string;
  day: number;
  meal: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  plannedStudents: number;
  messFacility: {
    id: string;
    name: string;
    location?: string;
  };
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
      costPer5Students: string;
      createdAt?: string;
      updatedAt?: string;
      recipes?: Array<{
        qtyPer5Students: string;
        item: { name: string; unit: string };
      }>;
    };
  }>;
}

const mealColors = {
  BREAKFAST: 'bg-orange-100 text-orange-800',
  LUNCH: 'bg-green-100 text-green-800',
  SNACKS: 'bg-purple-100 text-purple-800',
  DINNER: 'bg-blue-100 text-blue-800',
};

const MealPlans: React.FC = () => {
  const { user } = useAuth();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [messFacilities, setMessFacilities] = useState<{id: string; name: string; location?: string;}[]>([]);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    messFacilityId: string;
    day: number;
    meal: string;
    existingPlan?: MealPlan;
  } | null>(null);
  const [viewPlan, setViewPlan] = useState<MealPlan | null>(null);

  useEffect(() => {
    fetchMessFacilities();
  }, []);

  useEffect(() => {
    if (selectedFacility) {
      fetchMealPlans();
    }
  }, [selectedFacility]);

  const fetchMessFacilities = async () => {
    try {
      const response = await api.get('/fnb-manager/mess-facilities');
      setMessFacilities(response.data);
      if (response.data.length > 0) {
        setSelectedFacility(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch mess facilities:', error);
      showError('Error', 'Failed to load mess facilities');
    }
  };

  const fetchMealPlans = async () => {
    try {
      const response = await api.get('/meal-plans', {
        params: { messFacilityId: selectedFacility }
      });
      setMealPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch meal plans:', error);
      showError('Error', 'Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanClick = (day: number, meal: string) => {
    const existingPlan = mealPlans.find(
      plan => plan.day === day && plan.meal === meal && plan.messFacility.id === selectedFacility
    );
    
    setSelectedPlan({
      messFacilityId: selectedFacility,
      day,
      meal,
      existingPlan
    });
    setShowDrawer(true);
  };

  const handleEdit = (plan: MealPlan) => {
    setSelectedPlan({
      messFacilityId: plan.messFacility.id,
      day: plan.day,
      meal: plan.meal,
      existingPlan: plan
    });
    setShowDrawer(true);
  };

  const handleDelete = async (plan: MealPlan) => {
    const result = await showConfirm(
      'Delete Meal Plan',
      'Are you sure you want to delete this meal plan?'
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/meal-plans/${plan.id}`);
        showSuccess('Success', 'Meal plan deleted successfully');
        fetchMealPlans();
      } catch (error) {
        console.error('Failed to delete meal plan:', error);
        showError('Error', 'Failed to delete meal plan');
      }
    }
  };

  const handleView = (plan: MealPlan) => {
    setViewPlan(plan);
  };

  const handleDrawerSuccess = () => {
    setShowDrawer(false);
    setSelectedPlan(null);
    fetchMealPlans();
  };

  const handleDrawerCancel = () => {
    setShowDrawer(false);
    setSelectedPlan(null);
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex];
  };

  const getMealPlan = (day: number, meal: string) => {
   const mealplan= mealPlans.find(plan => 
      plan.day === day && 
      plan.meal === meal && 
      plan.messFacilityId === selectedFacility
    );
    return mealplan;
  };

  const canManage = user?.role === 'CHEF' || user?.role === 'ADMIN' || user?.role === 'FNB_MANAGER';
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Meal Plans</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Mess Facility</option>
            {messFacilities.map((facility: any) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedFacility && (
        <>
          {/* Facility Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Building size={20} className="text-blue-600" />
              <span className="font-medium text-blue-900">
                {messFacilities.find(f => f.id === selectedFacility)?.name}
              </span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Weekly meal plan - Multiple dishes can be added per meal
            </p>
          </div>

          {/* Weekly Calendar Grid */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-8 gap-0">
              {/* Header */}
              <div className="bg-gray-50 p-4 font-medium text-gray-900 border-b border-r">
                Meal / Day
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
                  <div className="bg-gray-50 p-4 font-medium text-gray-900 border-b border-r flex items-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${mealColors[meal as keyof typeof mealColors]}`}>
                      {meal}
                    </span>
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const plan = getMealPlan(day, meal);
                    return (
                      <div
                        key={`${day}-${meal}`}
                        className="p-4 border-b border-r min-h-[120px] hover:bg-gray-50 cursor-pointer transition-colors group"
                        onClick={() => canManage && handlePlanClick(day, meal)}
                      >
                        {plan ? (
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="space-y-1">
                                  {plan.dishes.map((dishItem, idx) => (
                                    <div key={idx} className="flex items-center space-x-1">
                                      <Chef size={10} />
                                      <span className="text-xs text-gray-900">{dishItem.dish.name}</span>
                                      {dishItem.isMainDish && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Main</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                  {plan.plannedStudents} students
                                </p>
                              </div>
                              {canManage && (
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleView(plan);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="View Details"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(plan);
                                    }}
                                    className="text-green-600 hover:text-green-800 p-1"
                                    title="Edit Plan"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(plan);
                                    }}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete Plan"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          canManage && (
                            <div className="flex items-center justify-center h-full text-gray-400 group-hover:text-gray-600">
                              <Plus size={20} />
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
        </>
      )}

      {/* Meal Plan Form Drawer */}
      <Drawer
         isOpen={showDrawer}
        onClose={handleDrawerCancel}
        title={selectedPlan?.existingPlan ? 'Edit Meal Plan' : 'Add Meal Plan'}
        size='xl'
      >
        {selectedPlan && (
          <MealPlanForm
            messFacilityId={selectedPlan.messFacilityId}
            day={selectedPlan.day}
            meal={selectedPlan.meal as any}
            existingPlan={selectedPlan.existingPlan}
            onSuccess={handleDrawerSuccess}
            onCancel={handleDrawerCancel}
          />
        )}
      </Drawer>

      {/* Meal Plan View Modal */}
      <Modal
        isOpen={!!viewPlan}
        onClose={() => setViewPlan(null)}
        title="Meal Plan Details"
        size="lg"
      >
        {viewPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Day</label>
                <p className="text-lg font-semibold">{getDayName(viewPlan.day)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Meal</label>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${mealColors[viewPlan.meal]}`}>
                  {viewPlan.meal}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mess Facility</label>
                <p className="text-lg">{viewPlan.messFacility.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Planned Students</label>
                <p className="text-lg font-semibold text-blue-600">{viewPlan.plannedStudents}</p>
              </div>
            </div>

            {viewPlan.dishes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Dishes & Ingredients Required</h4>
                <div className="overflow-x-auto">
                  <div className="space-y-4">
                    {viewPlan.dishes.map((dishItem, dishIndex) => (
                      <div key={dishIndex} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-gray-900">{dishItem.dish.name}</h5>
                          <div className="flex items-center space-x-2">
                            {dishItem.isMainDish && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Main Dish</span>
                            )}
                            <span className="text-sm text-green-600 font-medium">
                              ₹{((parseFloat(dishItem.dish.costPer5Students) / 5) * viewPlan.plannedStudents).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        {dishItem.dish.length > 0 && (
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Per 5 Students</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Required</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {dishItem.dish.map((recipe, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {recipe.item.name}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {(parseFloat(recipe.qtyPer5Students) * 1000).toFixed(0)}g
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {((parseFloat(recipe.qtyPer5Students) / 5) * viewPlan.plannedStudents).toFixed(2)} {recipe.item.unit}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MealPlans;