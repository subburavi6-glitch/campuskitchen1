import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import api from '../utils/api';
import Modal from './Modal';
import { showError, showConfirm } from '../utils/sweetAlert';

interface Category {
  id: string;
  name: string;
  _count?: { items: number };
}

interface CategoryManagerProps {
  onCategoryChange?: () => void;
  className?: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  onCategoryChange, 
  className = "" 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  // API Functions
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/items/categories');
      setCategories(response.data);
      onCategoryChange?.();
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      showError('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (name: string) => {
    try {
      await api.post('/items/categories', { name });
      toast.success('Category created successfully');
      return true;
    } catch (error) {
      console.error('Failed to create category:', error);
      showError('Error', 'Failed to create category');
      return false;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      await api.put(`/items/categories/${id}`, { name });
      toast.success('Category updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update category:', error);
      showError('Error', 'Failed to update category');
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.delete(`/items/categories/${id}`);
      toast.success('Category deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete category:', error);
      showError('Error', 'Failed to delete category');
      return false;
    }
  };

  // Event Handlers
  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setCategoryName('');
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category._count?.items && category._count.items > 0) {
      showError('Error', 'Cannot delete category with existing items');
      return;
    }

    const result = await showConfirm(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`
    );
    
    if (!result) return;
    
    const success = await deleteCategory(category.id);
    if (success) {
      fetchCategories();
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    let success = false;
    
    if (selectedCategory) {
      success = await updateCategory(selectedCategory.id, categoryName);
    } else {
      success = await createCategory(categoryName);
    }

    if (success) {
      setShowCategoryModal(false);
      fetchCategories();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Item Categories</h2>
            <p className="text-sm text-gray-500">Manage categories for inventory items</p>
          </div>
          <button
            onClick={handleAddCategory}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Category Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">
                    {category._count?.items || 0} items
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="Edit Category"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                    title="Delete Category"
                    disabled={!!category._count?.items && category._count.items > 0}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No categories found. Add your first category to get started.</p>
          </div>
        )}
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={selectedCategory ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter category name"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCategory}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{selectedCategory ? 'Update' : 'Create'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryManager;
