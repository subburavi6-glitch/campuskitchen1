import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Utensils, DollarSign, Clock, Eye } from 'lucide-react';
import api from '../../utils/api';
import Modal from '../Modal';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  price: number;
  imageUrl?: string;
  available: boolean;
  preparationTime: number;
}

interface MenuTabProps {
  facilityId: string;
}

const mealColors = {
  BREAKFAST: 'bg-orange-100 text-orange-800',
  LUNCH: 'bg-green-100 text-green-800',
  SNACKS: 'bg-purple-100 text-purple-800',
  DINNER: 'bg-blue-100 text-blue-800',
};

const MenuTab: React.FC<MenuTabProps> = ({ facilityId }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [mealFilter, setMealFilter] = useState('');

  useEffect(() => {
    fetchMenuItems();
  }, [facilityId, mealFilter]);

  const fetchMenuItems = async () => {
    try {
      const params: any = { messFacilityId: facilityId };
      if (mealFilter) params.mealType = mealFilter;
      
      const response = await api.get('/fnb-manager/menu-items', { params });
      setMenuItems(response.data);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item: MenuItem) => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        await api.delete(`/fnb-manager/menu-items/${item.id}`);
        toast.success('Menu item deleted successfully');
        fetchMenuItems();
      } catch (error) {
        console.error('Failed to delete menu item:', error);
      }
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await api.put(`/fnb-manager/menu-items/${item.id}`, {
        ...item,
        available: !item.available
      });
      toast.success(`Menu item ${!item.available ? 'enabled' : 'disabled'}`);
      fetchMenuItems();
    } catch (error) {
      console.error('Failed to update menu item:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedItem(null);
    fetchMenuItems();
  };

  const groupedItems = menuItems.reduce((groups, item) => {
    if (!groups[item.mealType]) {
      groups[item.mealType] = [];
    }
    groups[item.mealType].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Menu Items ({menuItems.length})
          </h3>
          <select
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Meals</option>
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="SNACKS">Snacks</option>
            <option value="DINNER">Dinner</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Menu Items by Meal Type */}
      {Object.entries(groupedItems).map(([mealType, items]) => (
        <div key={mealType} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className={`px-6 py-4 border-b ${mealColors[mealType as keyof typeof mealColors]} bg-opacity-50`}>
            <h4 className="font-semibold text-lg">{mealType}</h4>
            <p className="text-sm opacity-75">{items.length} items available</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h5 className="font-medium text-gray-900">{item.name}</h5>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-gray-600">{item.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                     
                      <span className="font-bold text-green-600 text-lg">₹{item.price}</span>
                    </div>
                    {item.preparationTime > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{item.preparationTime}m</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="Edit Item"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`text-xs px-2 py-1 rounded ${
                        item.available 
                          ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {item.available ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {menuItems.length === 0 && (
        <div className="text-center py-12">
          <Utensils size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
          <p className="text-gray-500 mb-4">Add menu items for individual ordering</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Menu Item
          </button>
        </div>
      )}

      {/* Menu Item Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        size="lg"
      >
        <MenuItemForm
          item={selectedItem}
          facilityId={facilityId}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

// Menu Item Form Component
const MenuItemForm: React.FC<{
  item?: MenuItem | null;
  facilityId: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ item, facilityId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    mealType: item?.mealType || 'LUNCH',
    price: item?.price || 0,
    imageUrl: item?.imageUrl || '',
    preparationTime: item?.preparationTime || 0,
    available: item?.available ?? true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = { ...formData, messFacilityId: facilityId };
      
      if (item) {
        await api.put(`/fnb-manager/menu-items/${item.id}`, data);
        toast.success('Menu item updated successfully');
      } else {
        await api.post('/fnb-manager/menu-items', data);
        toast.success('Menu item created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save menu item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter item name"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter item description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meal Type *
          </label>
          <select
            required
            value={formData.mealType}
            onChange={(e) => setFormData(prev => ({ ...prev, mealType: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="SNACKS">Snacks</option>
            <option value="DINNER">Dinner</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (₹) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL
          </label>
          <input
            type="url"
            value={formData.imageUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter image URL"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preparation Time (minutes)
          </label>
          <input
            type="number"
            min="0"
            value={formData.preparationTime}
            onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.available}
              onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Available for ordering
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
        </button>
      </div>
    </form>
  );
};

export default MenuTab;