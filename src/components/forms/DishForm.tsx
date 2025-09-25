import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { showSuccess, showError } from '../../utils/sweetAlert'; // FIXED: Added missing import
import { SERVERURL } from '../../utils/paths';

interface DishFormProps {
  dish?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface DishFormData {
  name: string;
  category?: string;
  recipes: Array<{
    itemId: string;
    qtyPer5Students: number;
  }>;
}

const DishForm: React.FC<DishFormProps> = ({ dish, onSuccess, onCancel }) => {
  const [items, setItems] = useState([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(dish?.imageUrl || null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // FIXED: Added data loading state

  const { register, control, handleSubmit, formState: { errors }, watch, reset } = useForm<DishFormData>({
    defaultValues: {
      name: '',
      category: '',
      recipes: [{ itemId: '', qtyPer5Students: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'recipes'
  });

  const watchedRecipes = watch('recipes');

  useEffect(() => {
    fetchItems();
  }, []);

  // FIXED: Reset form with dish data after items are loaded
  useEffect(() => {
    if (dataLoaded && dish) {
      reset({
        name: dish.name || '',
        category: dish.category || '',
        recipes: dish.recipes?.length > 0 
          ? dish.recipes.map((recipe: any) => ({
              itemId: recipe.itemId || '',
              qtyPer5Students: parseFloat(recipe.qtyPer5Students) || 0
            }))
          : [{ itemId: '', qtyPer5Students: 0 }]
      });
    }
  }, [dataLoaded, dish, reset]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data || []);
      setDataLoaded(true); // FIXED: Set data loaded after fetching
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setDataLoaded(true);
    }
  };

  const calculateDishCost = () => {
    return watchedRecipes.reduce((total, recipe) => {
      const item = items.find((i: any) => i.id === recipe.itemId);
      if (item && recipe.qtyPer5Students) {
        return total + (recipe.qtyPer5Students * parseFloat(item.costPerUnit || '0'));
      }
      return total;
    }, 0);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: DishFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.category) formData.append('category', data.category);
      formData.append('costPer5Students', calculateDishCost().toFixed(2));
      formData.append('recipes', JSON.stringify(data.recipes));

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (dish) {
        await api.put(`/dishes/${dish.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess('Success', 'Dish updated successfully');
      } else {
        await api.post('/dishes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess('Success', 'Dish created successfully');
      }
      onSuccess(); // FIXED: This will close the modal
    } catch (error) {
      console.error('Failed to save dish:', error);
      showError('Error', 'Failed to save dish');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dish Name *
          </label>
          <input
            {...register('name', { required: 'Dish name is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter dish name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            {...register('category')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Category</option>
            <option value="Main Course">Main Course</option>
            <option value="Staple">Staple</option>
            <option value="Side Dish">Side Dish</option>
            <option value="Dessert">Dessert</option>
            <option value="Beverage">Beverage</option>
            <option value="Snack">Snack</option>
          </select>
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dish Image
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
          {imagePreview ? (
            <div className="relative">
              <img
                src={SERVERURL+imagePreview}
                alt="Preview"
                className="max-h-32 rounded-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Recipe (5 Students Base)</h3>
            <p className="text-sm text-gray-600">Total cost for 5 students: ₹{calculateDishCost().toFixed(2)}</p>
          </div>
          <button
            type="button"
            onClick={() => append({ itemId: '', qtyPer5Students: 0 })}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm"
          >
            <Plus size={16} />
            <span>Add Ingredient</span>
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-lg">
              <div className="col-span-8">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredient *
                </label>
                <select
                  {...register(`recipes.${index}.itemId`, { required: 'Ingredient is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!dataLoaded} // FIXED: Disable until data is loaded
                >
                  <option value="">
                    {dataLoaded ? 'Select Ingredient' : 'Loading ingredients...'}
                  </option>
                  {items.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit?.symbol || item.unit?.name || 'Unit'}) {/* FIXED: Handle missing unit */}
                    </option>
                  ))}
                </select>
                {errors.recipes?.[index]?.itemId && (
                  <p className="mt-1 text-sm text-red-600">{errors.recipes[index]?.itemId?.message}</p>
                )}
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qty for 5 Students *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  {...register(`recipes.${index}.qtyPer5Students`, { 
                    required: 'Quantity is required',
                    valueAsNumber: true,
                    min: { value: 0.001, message: 'Quantity must be greater than 0' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.250"
                />
                {errors.recipes?.[index]?.qtyPer5Students && (
                  <p className="mt-1 text-sm text-red-600">{errors.recipes[index]?.qtyPer5Students?.message}</p>
                )}
              </div>

              <div className="col-span-1">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
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
          disabled={loading || !dataLoaded}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : dish ? 'Update Dish' : 'Create Dish'}
        </button>
      </div>
    </form>
  );
};

export default DishForm;
