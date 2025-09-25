import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Package, AlertTriangle, Edit, Trash2, Eye, Printer } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError, showConfirm, showAlert } from '../utils/sweetAlert';
import Modal from '../components/Modal';
import ItemForm from '../components/forms/ItemForm';
import { SERVERURL } from '../utils/paths';

interface Item {
  id: string;
  name: string;
  sku: string;
  unit: string | { symbol?: string; name?: string };
  category: { name: string };
  preferredVendor?: { name: string };
  imageUrl?: string;
  moq: number;
  reorderPoint: number;
  totalStock: number;
  avgCost: number;
  hasAlerts: boolean;
}

const Items: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [viewItem, setViewItem] = useState<Item | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
      
      // Show alerts for low stock items using SweetAlert
      const lowStockItems = response.data.filter((item: Item) => 
        item.totalStock <= item.reorderPoint
      );
      
      if (lowStockItems.length > 0) {
        const alertMessage = `${lowStockItems.length} items are below reorder point:\n${
          lowStockItems.slice(0, 5).map((item: Item) => `• ${item.name} (${item.totalStock} ${typeof item.unit === 'object' ? (item.unit.symbol ?? item.unit.name ?? '') : item.unit})`).join('\n')
        }${lowStockItems.length > 5 ? `\n...and ${lowStockItems.length - 5} more` : ''}`;
        
        showAlert('Low Stock Alert', alertMessage, 'warning');
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      showError('Error', 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item: Item) => {
    const result = await showConfirm(
      'Delete Item',
      `Are you sure you want to delete ${item.name}?`
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/items/${item.id}`);
        showSuccess('Success', 'Item deleted successfully');
        fetchItems();
      } catch (error) {
        console.error('Failed to delete item:', error);
        showError('Error', 'Failed to delete item');
      }
    }
  };

  const handleView = (item: Item) => {
    setViewItem(item);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedItem(null);
    fetchItems();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = user?.role === 'ADMIN' || user?.role === 'STORE';
  const canView = user?.role === 'CHEF' || user?.role === 'COOK' || user?.role === 'VIEWER' || canManage;

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view items.</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={16} />
          <span>Add Item</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
            <Filter size={16} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                </div>
              </div>
              {item.hasAlerts && (
                <AlertTriangle size={20} className="text-red-500" />
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium">{item.category.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stock:</span>
                <span className={`font-medium ${
                  item.totalStock <= item.reorderPoint ? 'text-red-600' : 'text-green-600'
                }`}>
                  {item.totalStock} {typeof item.unit === 'object' ? (item.unit.symbol ?? item.unit.name ?? '') : item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Cost:</span>
                <span className="font-medium">₹{item.avgCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reorder Point:</span>
                <span className="font-medium">{item.reorderPoint} {typeof item.unit === 'object' ? (item.unit.symbol ?? item.unit.name ?? '') : item.unit}</span>
              </div>
              {item.preferredVendor && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendor:</span>
                  <span className="font-medium">{item.preferredVendor.name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.totalStock <= item.reorderPoint
                    ? 'bg-red-100 text-red-800'
                    : item.totalStock <= item.moq
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {item.totalStock <= item.reorderPoint
                    ? 'Low Stock'
                    : item.totalStock <= item.moq
                    ? 'Below MOQ'
                    : 'In Stock'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleView(item)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-green-600 hover:text-green-800 p-1 rounded"
                    title="Edit Item"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:text-red-800 p-1 rounded"
                    title="Delete Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first item'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Item
          </button>
        </div>
      )}

      {/* Item Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedItem ? 'Edit Item' : 'Add Item'}
        size="xl"
      >
        <ItemForm
          item={selectedItem}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Item View Modal */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title="Item Details"
        size="lg"
      >
        {viewItem && (
          <div className="space-y-4">
            {viewItem.imageUrl && (
              <div className="text-center">
                <img
                  src={SERVERURL+viewItem.imageUrl}
                  alt={viewItem.name}
                  className="max-h-48 mx-auto rounded-lg"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg font-semibold">{viewItem.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">SKU</label>
                <p className="text-lg">{viewItem.sku}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Category</label>
                <p className="text-lg">{viewItem.category.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Unit</label>
                <p className="text-lg">{typeof viewItem.unit === 'object' ? (viewItem.unit.symbol ?? viewItem.unit.name ?? '') : viewItem.unit}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Current Stock</label>
                <p className={`text-lg font-semibold ${
                  viewItem.totalStock <= viewItem.reorderPoint ? 'text-red-600' : 'text-green-600'
                }`}>
                  {viewItem.totalStock} {typeof viewItem.unit === 'object' ? (viewItem.unit.symbol ?? viewItem.unit.name ?? '') : viewItem.unit}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Reorder Point</label>
                <p className="text-lg">{viewItem.reorderPoint} {typeof viewItem.unit === 'object' ? (viewItem.unit.symbol ?? viewItem.unit.name ?? '') : viewItem.unit}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">MOQ</label>
                <p className="text-lg">{viewItem.moq} {typeof viewItem.unit === 'object' ? (viewItem.unit.symbol ?? viewItem.unit.name ?? '') : viewItem.unit}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Average Cost</label>
                <p className="text-lg">₹{viewItem.avgCost.toFixed(2)}</p>
              </div>
              {viewItem.preferredVendor && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Preferred Vendor</label>
                  <p className="text-lg">{viewItem.preferredVendor.name}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Items;