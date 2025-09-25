import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Save, Database, Cog, Users, Package } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert';
import CategoryManager from '../components/CategoryManager';

interface ConfigItem {
  id: string;
  name: string;
  symbol?: string;
  description?: string;
  active: boolean;
  _count?: { items: number };
}

interface Category {
  id: string;
  name: string;
  _count?: { items: number };
}

const AdminConfig: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('units');
  const [units, setUnits] = useState<ConfigItem[]>([]);
  const [storageTypes, setStorageTypes] = useState<ConfigItem[]>([]);
  const [vendorCategories, setVendorCategories] = useState<ConfigItem[]>([]);
  const [itemCategories, setItemCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConfigItem | null>(null);
  const [modalType, setModalType] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [unitsRes, storageRes, vendorCatRes, itemCatRes] = await Promise.all([
        api.get('/admin-config/units'),
        api.get('/admin-config/storage-types'),
        api.get('/admin-config/vendor-categories'),
        api.get('/items/categories')
      ]);
      
      setUnits(unitsRes.data);
      setStorageTypes(storageRes.data);
      setVendorCategories(vendorCatRes.data);
      setItemCategories(itemCatRes.data);
    } catch (error) {
      showError('Error', 'Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (type: string) => {
    setModalType(type);
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: ConfigItem, type: string) => {
    setModalType(type);
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item: ConfigItem, type: string) => {
    // Check if item categories have associated items
    if (type === 'item-categories' && item._count?.items && item._count.items > 0) {
      showError('Error', 'Cannot delete category with existing items');
      return;
    }

    const result = await showConfirm(
      'Delete Confirmation',
      `Are you sure you want to delete "${item.name}"?`
    );

    if (result.isConfirmed) {
      try {
        const endpoint = type === 'item-categories' ? `/items/categories/${item.id}` : `/admin-config/${type}/${item.id}`;
        await api.delete(endpoint);
        showSuccess('Success', `${type.replace('-', ' ')} deleted successfully`);
        fetchAllData();
      } catch (error) {
        showError('Error', `Failed to delete ${type.replace('-', ' ')}`);
      }
    }
  };

  const handleToggleStatus = async (item: ConfigItem, type: string) => {
    try {
      const endpoint = type === 'item-categories' ? `/items/categories/${item.id}` : `/admin-config/${type}/${item.id}`;
      await api.put(endpoint, {
        ...item,
        active: !item.active
      });
      showSuccess('Success', `${type.replace('-', ' ')} status updated`);
      fetchAllData();
    } catch (error) {
      showError('Error', `Failed to update ${type.replace('-', ' ')} status`);
    }
  };

  const tabs = [
    { id: 'units', label: 'Units', icon: Database },
    { id: 'storage-types', label: 'Storage Types', icon: Cog },
    { id: 'vendor-categories', label: 'Vendor Categories', icon: Users },
    { id: 'item-categories', label: 'Item Categories', icon: Package },
  ];

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Database size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to access admin configuration.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'units': return units;
      case 'storage-types': return storageTypes;
      case 'vendor-categories': return vendorCategories;
      case 'item-categories': return itemCategories;
      default: return [];
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'item-categories') {
      return (
        // <CategoryManagerTab 
        //   categories={itemCategories}
        //   onAdd={() => handleAdd('item-categories')}
        //   onEdit={(item) => handleEdit(item, 'item-categories')}
        //   onDelete={(item) => handleDelete(item, 'item-categories')}
        //   onToggleStatus={(item) => handleToggleStatus(item, 'item-categories')}
        // />
        <CategoryManager/>
      );
    }

    return (
      <ConfigTabContent 
        data={getCurrentData()}
        type={activeTab}
        onAdd={() => handleAdd(activeTab)}
        onEdit={(item) => handleEdit(item, activeTab)}
        onDelete={(item) => handleDelete(item, activeTab)}
        onToggleStatus={(item) => handleToggleStatus(item, activeTab)}
        tabs={tabs}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Configuration</h1>
        <p className="text-gray-600">Manage system dropdowns and configurations</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Configuration Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${selectedItem ? 'Edit' : 'Add'} ${tabs.find(t => t.id === modalType)?.label.slice(0, -1) || modalType.replace('-', ' ')}`}
        size="md"
      >
        <ConfigForm
          type={modalType}
          item={selectedItem}
          onSuccess={() => {
            setShowModal(false);
            fetchAllData();
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

// Category Manager Tab Component
const CategoryManagerTab: React.FC<{
  categories: Category[];
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onToggleStatus: (item: any) => void;
}> = ({ categories, onAdd, onEdit, onDelete, onToggleStatus }) => {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Item Categories</h3>
        <button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

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
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {category._count?.items || 0} items
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => onEdit(category)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onDelete(category)}
                  className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                  title="Delete"
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
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-500 mb-4">Add your first category to get started</p>
          <button
            onClick={onAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Category
          </button>
        </div>
      )}
    </>
  );
};

// Config Tab Content Component
const ConfigTabContent: React.FC<{
  data: ConfigItem[];
  type: string;
  onAdd: () => void;
  onEdit: (item: ConfigItem) => void;
  onDelete: (item: ConfigItem) => void;
  onToggleStatus: (item: ConfigItem) => void;
  tabs: any[];
}> = ({ data, type, onAdd, onEdit, onDelete, onToggleStatus, tabs }) => {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {tabs.find(t => t.id === type)?.label}
        </h3>
        <button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Add {tabs.find(t => t.id === type)?.label.slice(0, -1)}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                {item.symbol && (
                  <p className="text-sm text-gray-500">Symbol: {item.symbol}</p>
                )}
                {item.description && (
                  <p className="text-sm text-gray-500">{item.description}</p>
                )}
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                  item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => onEdit(item)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onToggleStatus(item)}
                  className={`p-1 rounded ${
                    item.active 
                      ? 'text-red-600 hover:text-red-800' 
                      : 'text-green-600 hover:text-green-800'
                  }`}
                  title={item.active ? 'Deactivate' : 'Activate'}
                >
                  <Cog size={16} />
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="text-red-600 hover:text-red-800 p-1 rounded"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8">
          <Database size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500 mb-4">Add your first {tabs.find(t => t.id === type)?.label.toLowerCase()}</p>
          <button
            onClick={onAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add {tabs.find(t => t.id === type)?.label.slice(0, -1)}
          </button>
        </div>
      )}
    </>
  );
};

// Configuration Form Component
const ConfigForm: React.FC<{
  type: string;
  item?: ConfigItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ type, item, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    symbol: item?.symbol || '',
    description: item?.description || '',
    active: item?.active ?? true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = type === 'item-categories' ? '/items/categories' : `/admin-config/${type}`;
      
      if (item) {
        await api.put(`${endpoint}/${item.id}`, formData);
        showSuccess('Success', `${type.replace('-', ' ')} updated successfully`);
      } else {
        await api.post(endpoint, formData);
        showSuccess('Success', `${type.replace('-', ' ')} created successfully`);
      }
      onSuccess();
    } catch (error) {
      showError('Error', `Failed to save ${type.replace('-', ' ')}`);
    } finally {
      setLoading(false);
    }
  };

  const getFormFields = () => {
    switch (type) {
      case 'units':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Kilogram"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Symbol *</label>
              <input
                type="text"
                required
                value={formData.symbol}
                onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., kg"
              />
            </div>
          </>
        );
      case 'storage-types':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Storage Type *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Refrigerated"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe storage conditions"
              />
            </div>
          </>
        );
      case 'vendor-categories':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Fresh Produce"
            />
          </div>
        );
      case 'item-categories':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Vegetables"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {getFormFields()}
      
      {/* Only show active toggle for non-item-categories */}
      {type !== 'item-categories' && (
        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">Active</label>
          </div>
        </div>
      )}

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
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save size={16} />
          <span>{loading ? 'Saving...' : item ? 'Update' : 'Create'}</span>
        </button>
      </div>
    </form>
  );
};

export default AdminConfig;
