import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X, 
  Clock,
  DollarSign,
  Calendar,
  User,
  Utensils,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARED' | 'SERVED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  student: {
    name: string;
    registerNumber: string;
    userType: string;
  };
  messFacility: {
    name: string;
  };
  items: Array<{
    menuItem: {
      name: string;
      price: number;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specialInstructions?: string;
  }>;
  createdAt: string;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARED: 'bg-purple-100 text-purple-800',
  SERVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const paymentStatusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const mealColors = {
  BREAKFAST: 'bg-orange-100 text-orange-800',
  LUNCH: 'bg-green-100 text-green-800',
  SNACKS: 'bg-purple-100 text-purple-800',
  DINNER: 'bg-blue-100 text-blue-800',
};

type SortField = 'orderNumber' | 'studentName' | 'createdAt' | 'mealType' | 'totalAmount' | 'status';
type SortDirection = 'asc' | 'desc';

const StudentOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mealFilter, setMealFilter] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, mealFilter]);

  const fetchOrders = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (mealFilter) params.mealType = mealFilter;
      
      const response = await api.get('/fnb-manager/orders', { params });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/fnb-manager/orders/${orderId}`, { status: newStatus });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const sortedAndFilteredOrders = orders
    .filter(order =>
      order.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.student.registerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'studentName':
          aValue = a.student.name;
          bValue = b.student.name;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'mealType':
          aValue = a.mealType;
          bValue = b.mealType;
          break;
        case 'totalAmount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const canManage = user?.role === 'FNB_MANAGER';

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
        <h1 className="text-2xl font-bold text-gray-900">Student Orders</h1>
        <div className="text-sm text-gray-500">
          Total Orders: {sortedAndFilteredOrders.length}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by student name, register number, or order number..."
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
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARED">Prepared</option>
            <option value="SERVED">Served</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Meals</option>
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="SNACKS">Snacks</option>
            <option value="DINNER">Dinner</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('orderNumber')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Order #</span>
                    {getSortIcon('orderNumber')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('studentName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Student</span>
                    {getSortIcon('studentName')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('mealType')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Meal Type</span>
                    {getSortIcon('mealType')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Amount</span>
                    {getSortIcon('totalAmount')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAndFilteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <ShoppingCart size={16} className="text-blue-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.student.name}</div>
                      <div className="text-xs text-gray-500">{order.student.registerNumber}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mealColors[order.mealType]}`}>
                      <Utensils size={12} className="mr-1" />
                      {order.mealType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">
                      ₹{order.totalAmount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status === 'PENDING' && <Clock size={12} className="mr-1" />}
                      {order.status === 'CONFIRMED' && <Check size={12} className="mr-1" />}
                      {order.status === 'PREPARED' && <Utensils size={12} className="mr-1" />}
                      {order.status === 'SERVED' && <Check size={12} className="mr-1" />}
                      {order.status === 'CANCELLED' && <X size={12} className="mr-1" />}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[order.paymentStatus]}`}>
                      <DollarSign size={12} className="mr-1" />
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setViewOrder(order)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && order.status !== 'SERVED' && order.status !== 'CANCELLED' && (
                        <>
                          {order.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                                title="Confirm Order"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                                title="Cancel Order"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleStatusUpdate(order.id, 'PREPARED')}
                              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors"
                              title="Mark as Prepared"
                            >
                              Prepared
                            </button>
                          )}
                          {order.status === 'PREPARED' && (
                            <button
                              onClick={() => handleStatusUpdate(order.id, 'SERVED')}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                              title="Mark as Served"
                            >
                              Served
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedAndFilteredOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter || mealFilter ? 'Try adjusting your filters' : 'No student orders have been placed yet'}
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title="Order Details"
        size="lg"
      >
        {viewOrder && (
          <div className="space-y-6">
            {/* Order Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Order Number</label>
                  <p className="text-lg font-semibold text-gray-900">{viewOrder.orderNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Student</label>
                  <p className="text-lg text-gray-900">{viewOrder.student.name}</p>
                  <p className="text-sm text-gray-500">{viewOrder.student.registerNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mess Facility</label>
                  <p className="text-lg text-gray-900">{viewOrder.messFacility.name}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Order Date</label>
                  <p className="text-lg text-gray-900">{new Date(viewOrder.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{new Date(viewOrder.createdAt).toLocaleTimeString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Meal Type</label>
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${mealColors[viewOrder.mealType]}`}>
                    <Utensils size={14} className="mr-1" />
                    {viewOrder.mealType}
                  </span>
                </div>
                <div className="flex space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${statusColors[viewOrder.status]}`}>
                      {viewOrder.status === 'PENDING' && <Clock size={14} className="mr-1" />}
                      {viewOrder.status === 'CONFIRMED' && <Check size={14} className="mr-1" />}
                      {viewOrder.status === 'PREPARED' && <Utensils size={14} className="mr-1" />}
                      {viewOrder.status === 'SERVED' && <Check size={14} className="mr-1" />}
                      {viewOrder.status === 'CANCELLED' && <X size={14} className="mr-1" />}
                      {viewOrder.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Payment</label>
                    <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${paymentStatusColors[viewOrder.paymentStatus]}`}>
                      <DollarSign size={14} className="mr-1" />
                      {viewOrder.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Utensils size={18} className="mr-2" />
                Order Items
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewOrder.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.menuItem.name}</div>
                          {item.specialInstructions && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ₹{item.unitPrice}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          ₹{item.totalPrice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <DollarSign size={20} className="text-green-600 mr-2" />
                  <span className="font-semibold text-gray-900">Order Total:</span>
                </div>
                <span className="font-bold text-2xl text-green-600">₹{viewOrder.totalAmount}</span>
              </div>
            </div>

            {/* Management Actions (if applicable) */}
            {canManage && viewOrder.status !== 'SERVED' && viewOrder.status !== 'CANCELLED' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-3">Order Management</h5>
                <div className="flex flex-wrap gap-2">
                  {viewOrder.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => {
                          handleStatusUpdate(viewOrder.id, 'CONFIRMED');
                          setViewOrder(null);
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Check size={16} className="mr-2" />
                        Confirm Order
                      </button>
                      <button
                        onClick={() => {
                          handleStatusUpdate(viewOrder.id, 'CANCELLED');
                          setViewOrder(null);
                        }}
                        className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X size={16} className="mr-2" />
                        Cancel Order
                      </button>
                    </>
                  )}
                  {viewOrder.status === 'CONFIRMED' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(viewOrder.id, 'PREPARED');
                        setViewOrder(null);
                      }}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Utensils size={16} className="mr-2" />
                      Mark as Prepared
                    </button>
                  )}
                  {viewOrder.status === 'PREPARED' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(viewOrder.id, 'SERVED');
                        setViewOrder(null);
                      }}
                      className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check size={16} className="mr-2" />
                      Mark as Served
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentOrders;