import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, ShoppingCart, Eye, Edit, Trash2, FileText } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import PurchaseOrderForm from '../components/forms/PurchaseOrderForm';
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert';
import { printDocument } from '../utils/printUtils';

interface PurchaseOrder {
  id: string;
  poNo: string;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'CANCELLED';
  vendor: { name: string };
  creator: { name: string };
  subtotal: string;
  tax: string;
  total: string;
  approved: boolean;
  locked: boolean;
  createdAt: string;
  items: Array<{
    item: { name: string; unit: string };
    orderedQty: string;
    receivedQty: number;
    unitCost: string;
    pointsUsed: number;
  }>;
}

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const PurchaseOrders: React.FC = () => {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [statusFilter]);

  const fetchPurchaseOrders = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await api.get('/purchase-orders', { params });
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowDrawer(true);
  };

  const handleDelete = async (po: PurchaseOrder) => {
    const result = await showConfirm(
      'Delete Purchase Order',
      `Are you sure you want to delete PO ${po.poNo}?`
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/purchase-orders/${po.id}`);
        showSuccess('Success', 'Purchase order deleted successfully');
        fetchPurchaseOrders();
      } catch (error) {
        console.error('Failed to delete purchase order:', error);
      }
    }
  };

  const handleView = (po: PurchaseOrder) => {
    setViewPO(po);
  };

  const handlePrint = (po: PurchaseOrder) => {
    printDocument(api, `/purchase-orders/${po.id}/print`, 'po');
  };

  const handleFormSuccess = () => {
    setShowDrawer(false);
    setSelectedPO(null);
    fetchPurchaseOrders();
  };

  const handleFormCancel = () => {
    setShowDrawer(false);
    setSelectedPO(null);
  };

  const handleRaisePO = async () => {
    // Feature removed as per requirements
  };

  const filteredPOs = purchaseOrders.filter(po =>
    po.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = user?.role === 'ADMIN' || user?.role === 'STORE';

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
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        {canManage && (
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDrawer(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus size={16} />
              <span>Create PO</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="PARTIAL">Partial</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPOs.map((po, index) => (
          <motion.div
            key={po.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{po.poNo}</h3>
                  <p className="text-sm text-gray-500">{po.vendor.name}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[po.status]}`}>
                {po.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created by:</span>
                <span className="font-medium">{po.creator.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(po.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{po.items.length}</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-lg font-bold text-green-600">₹{po.total}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">Status:</span>
                <div className="flex space-x-2">
                  {po.approved && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Approved</span>
                  )}
                  {po.locked && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Locked</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleView(po)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                {canManage && po.status !== 'CLOSED' && (
                  <>
                    <button
                      onClick={() => handleEdit(po)}
                      className="text-green-600 hover:text-green-800 p-1 rounded"
                      title="Edit PO"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(po)}
                      className="text-red-600 hover:text-red-800 p-1 rounded"
                      title="Delete PO"
                      disabled={po.locked}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
              <button 
                onClick={() => handlePrint(po)}
                className="text-gray-600 hover:text-gray-800 p-1 rounded" 
                title="Print PO"
              >
                <FileText size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredPOs.length === 0 && !loading && (
        <div className="text-center py-12">
          <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first purchase order'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowDrawer(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create Purchase Order
            </button>
          )}
        </div>
      )}

      {/* PO Form Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={handleFormCancel}
        size='xl'
        title={selectedPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
      >
        <PurchaseOrderForm
          purchaseOrder={selectedPO}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Drawer>

      {/* PO View Modal */}
      <Modal
        isOpen={!!viewPO}
        onClose={() => setViewPO(null)}
        title="Purchase Order Details"
        size="xl"
      >
        {viewPO && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">PO Number</label>
                <p className="text-lg font-semibold">{viewPO.poNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColors[viewPO.status]}`}>
                  {viewPO.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Vendor</label>
                <p className="text-lg">{viewPO.vendor.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created By</label>
                <p className="text-lg">{viewPO.creator.name}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewPO.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.orderedQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.receivedQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{item.unitCost}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{(parseFloat(item.orderedQty) * parseFloat(item.unitCost)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.pointsUsed} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium">₹{viewPO.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax:</span>
                  <span className="text-sm font-medium">₹{viewPO.tax}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg">₹{viewPO.total}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default PurchaseOrders;