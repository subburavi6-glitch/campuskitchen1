import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, ChefHat, Building } from 'lucide-react';
import api from '../../utils/api';
import { showSuccess, showError } from '../../utils/sweetAlert';

interface MealPlanFormProps {
  messFacilityId?: string;
  day: number;
  meal: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  existingPlan?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface MealPlanFormData {
  messFacilityIds: string[];
  dishes: Array<{
    dishId: string;
    sequenceOrder: number;
    isMainDish: boolean;
  }>;
}

const MealPlanForm: React.FC<MealPlanFormProps> = ({ 
  messFacilityId,
  day, 
  meal, 
  existingPlan, 
  onSuccess, 
  onCancel 
}) => {
  const [dishes, setDishes] = useState([]);
  const [messFacilities, setMessFacilities] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MealPlanFormData>({
    defaultValues: existingPlan ? {
      messFacilityIds: [existingPlan.messFacilityId],
      dishes: existingPlan.dishes || [{ dishId: '', sequenceOrder: 1, isMainDish: true }]
    } : {
      messFacilityIds: messFacilityId ? [messFacilityId] : [],
      dishes: [{ dishId: '', sequenceOrder: 1, isMainDish: true }]
    }
  });

  const watchedDishes = watch('dishes');
  const watchedFacilities = watch('messFacilityIds');

  useEffect(() => {
    fetchDishes();
    fetchMessFacilities();
  }, []);

  const fetchDishes = async () => {
    try {
      const response = await api.get('/dishes');
      setDishes(response.data);
    } catch (error) {
      console.error('Failed to fetch dishes:', error);
    }
  };

  const fetchMessFacilities = async () => {
    try {
      const response = await api.get('/fnb-manager/mess-facilities');
      setMessFacilities(response.data.filter((f: any) => f.active));
    } catch (error) {
      console.error('Failed to fetch mess facilities:', error);
    }
  };

  const addDish = () => {
    const newDishes = [...watchedDishes, { 
      dishId: '', 
      sequenceOrder: watchedDishes.length + 1, 
      isMainDish: false 
    }];
    setValue('dishes', newDishes);
  };

  const removeDish = (index: number) => {
    const newDishes = watchedDishes.filter((_, i) => i !== index);
    setValue('dishes', newDishes);
  };

  const updateDish = (index: number, field: string, value: any) => {
    const newDishes = [...watchedDishes];
    newDishes[index] = { ...newDishes[index], [field]: value };
    setValue('dishes', newDishes);
  };

  const toggleFacility = (facilityId: string) => {
    const currentFacilities = watchedFacilities || [];
    const newFacilities = currentFacilities.includes(facilityId)
      ? currentFacilities.filter(id => id !== facilityId)
      : [...currentFacilities, facilityId];
    setValue('messFacilityIds', newFacilities);
  };

  const onSubmit = async (data: MealPlanFormData) => {
    if (data.messFacilityIds.length === 0) {
      showError('Error', 'Please select at least one mess facility');
      return;
    }

    setLoading(true);
    try {
      await api.post('/meal-plans', {
        messFacilityIds: data.messFacilityIds,
        day,
        meal,
        dishes: data.dishes
      });
      showSuccess('Success', `Meal plan saved for ${data.messFacilityIds.length} facilities`);
      onSuccess();
    } catch (error) {
      console.error('Failed to save meal plan:', error);
      showError('Error', 'Failed to save meal plan');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex];
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900">
          Planning {meal} for {getDayName(day)}
        </h4>
        <p className="text-sm text-blue-700">Planned students will be calculated automatically from active subscriptions</p>
      </div>

      {/* Mess Facilities Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Mess Facilities *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {messFacilities.map((facility: any) => (
            <label key={facility.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={watchedFacilities?.includes(facility.id) || false}
                onChange={() => toggleFacility(facility.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center space-x-2">
                <Building size={16} className="text-gray-400" />
                <div>
                  <span className="font-medium text-gray-900">{facility.name}</span>
                  {facility.location && (
                    <p className="text-sm text-gray-500">{facility.location}</p>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Dishes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dishes for this Meal</h3>
          <button
            type="button"
            onClick={addDish}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm"
          >
            <Plus size={16} />
            <span>Add Dish</span>
          </button>
        </div>

        <div className="space-y-4">
          {watchedDishes.map((dishItem, index) => {
            const selectedDish = dishes.find((d: any) => d.id === dishItem.dishId);
            return (
              <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-lg">
                <div className="col-span-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dish *
                  </label>
                  <select
                    value={dishItem.dishId}
                    onChange={(e) => updateDish(index, 'dishId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Dish</option>
                    {dishes.map((dish: any) => (
                      <option key={dish.id} value={dish.id}>
                        {dish.name} {dish.category && `(${dish.category})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dishItem.sequenceOrder}
                    onChange={(e) => updateDish(index, 'sequenceOrder', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Main Dish
                  </label>
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={dishItem.isMainDish}
                      onChange={(e) => updateDish(index, 'isMainDish', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost/5
                  </label>
                  <p className="text-sm font-medium text-green-600 py-2">
                    {selectedDish ? `₹${selectedDish.costPer5Students}` : '₹0'}
                  </p>
                </div>

                <div className="col-span-1">
                  {watchedDishes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDish(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Meal Plan'}
        </button>
      </div>
    </form>
  );
};

export default MealPlanForm;