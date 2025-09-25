import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, ChefHat as Chef, Utensils, Edit, Trash2, Eye } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import DishForm from '../components/forms/DishForm';
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert';
import { SERVERURL } from '../utils/paths';

interface Dish {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
  costPer5Students: string;
  recipes: Array<{
    qtyPer5Students: string;
    item: { name: string; unit: any };
  }>;
}

const Dishes: React.FC = () => {
  const { user } = useAuth();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [viewDish, setViewDish] = useState<Dish | null>(null);

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    try {
      const response = await api.get('/dishes');
      setDishes(response.data);
    } catch (error) {
      console.error('Failed to fetch dishes:', error);
      showError('Error', 'Failed to load dishes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dish: Dish) => {
    setSelectedDish(dish);
    setShowModal(true);
  };

  const handleDelete = async (dish: Dish) => {
    const result = await showConfirm(
      'Delete Dish',
      `Are you sure you want to delete ${dish.name}?`
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/dishes/${dish.id}`);
        showSuccess('Success', 'Dish deleted successfully');
        fetchDishes();
      } catch (error) {
        console.error('Failed to delete dish:', error);
        showError('Error', 'Failed to delete dish');
      }
    }
  };

  const handleView = (dish: Dish) => {
    setViewDish(dish);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedDish(null);
    fetchDishes();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedDish(null);
  };

  const filteredDishes = dishes.filter(dish =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dish.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = user?.role === 'CHEF' || user?.role === 'ADMIN';

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
        <h1 className="text-2xl font-bold text-gray-900">Dishes & Recipes</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add Dish</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDishes.map((dish, index) => (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            {dish.imageUrl && (
              <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
                <img
                  src={SERVERURL+dish.imageUrl}
                  alt={dish.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Chef size={24} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{dish.name}</h3>
                  {dish.category && (
                    <p className="text-sm text-gray-500">{dish.category}</p>
                  )}
                </div>
              </div>
              <Utensils size={20} className="text-gray-400" />
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700 font-medium">Cost for 5 Students:</span>
                <span className="text-lg font-bold text-green-800">₹{dish.costPer5Students}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-green-600">Per Student:</span>
                <span className="text-sm font-semibold text-green-700">₹{(parseFloat(dish.costPer5Students) / 5).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">
                Recipe for 5 Students ({dish.recipes.length} ingredients)
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {dish.recipes.length > 0 ? (
                  dish.recipes.map((recipe, recipeIndex) => (
                    <div key={recipeIndex} className="flex justify-between text-sm">
                      <span className="text-gray-600">{recipe.item.name}</span>
                      <span className="font-medium">
                        {parseFloat(recipe.qtyPer5Students) * 1000}g total
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No recipe defined</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Base: 5 Students</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleView(dish)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View Recipe"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleEdit(dish)}
                        className="text-green-600 hover:text-green-800 p-1 rounded"
                        title="Edit Dish"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(dish)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        title="Delete Dish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredDishes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Chef size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dishes found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first dish'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add Dish
            </button>
          )}
        </div>
      )}

      {/* Dish Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedDish ? 'Edit Dish' : 'Add New Dish'}
        size="xl"
      >
        <DishForm
          dish={selectedDish}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Dish View Modal */}
      <Modal
        isOpen={!!viewDish}
        onClose={() => setViewDish(null)}
        title="Dish Details"
        size="lg"
      >
        {viewDish && (
          <div className="space-y-4">
            {viewDish.imageUrl && (
              <div className="text-center">
                <img
                  src={SERVERURL+viewDish.imageUrl}
                  alt={viewDish.name}
                  className="max-h-48 mx-auto rounded-lg"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Dish Name</label>
                <p className="text-xl font-semibold">{viewDish.name}</p>
              </div>
              {viewDish.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Category</label>
                  <p className="text-lg">{viewDish.category}</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Cost for 5 Students</label>
                <p className="text-2xl font-bold text-green-600">₹{viewDish.costPer5Students}</p>
                <p className="text-sm text-gray-500">₹{(parseFloat(viewDish.costPer5Students) / 5).toFixed(2)} per student</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recipe for 5 Students</h4>
              {viewDish.recipes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty for 5 Students</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Per Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">For 100 Students</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {viewDish.recipes.map((recipe, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {recipe.item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(parseFloat(recipe.qtyPer5Students) * 1000).toFixed(0)}g
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(parseFloat(recipe.qtyPer5Students) / 5 * 1000).toFixed(0)}g
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(parseFloat(recipe.qtyPer5Students) * 20).toFixed(2)} {typeof recipe.item.unit === 'object' ? (recipe.item.unit.symbol ?? recipe.item.unit.name ?? '') : recipe.item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">No recipe defined</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dishes;