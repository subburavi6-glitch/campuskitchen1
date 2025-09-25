import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, CreditCard, Calendar, User, Building, Eye, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { showConfirm, showSuccess } from '../utils/sweetAlert';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  amountPaid: number;
  student: {
    name: string;
    registerNumber: string;
    userType: 'STUDENT' | 'EMPLOYEE';
    employeeId?: string;
    department?: string;
  };
  package: {
    name: string;
    mealsIncluded: string[];
  };
  messFacility: {
    name: string;
  };
  createdAt: string;
}

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const userTypeColors = {
  STUDENT: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-purple-100 text-purple-800',
};

const Subscriptions: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [messFilter, setMessFilter] = useState('');
  const [messFacilities, setMessFacilities] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ totalSubscriptions: 0, activeSubscriptions: 0, expiringSubscriptions: 0 });
  const [viewSubscription, setViewSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchMessFacilities();
    fetchSubscriptions();
  }, [statusFilter, userTypeFilter, messFilter]);
  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/fnb-manager/dashboard');
      setDashboardStats({
        totalSubscriptions: response.data.stats.totalSubscriptions,
        activeSubscriptions: response.data.stats.activeSubscriptions,
        expiringSubscriptions: response.data.stats.expiringSubscriptions
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchMessFacilities = async () => {
    try {
      const response = await api.get('/fnb-manager/mess-facilities');
      setMessFacilities(response.data);
    } catch (error) {
      console.error('Failed to fetch mess facilities:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (userTypeFilter) params.userType = userTypeFilter;
      if (messFilter) params.messFacilityId = messFilter;
      const response = await api.get('/fnb-manager/subscriptions', { params });
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (subscription: Subscription) => {
    setViewSubscription(subscription);
  };

  const handleStatusUpdate = async (subscriptionId: string, newStatus: string) => {
    try {
      const response = await api.put(`/fnb-manager/subscriptions/${subscriptionId}`, { status: newStatus });
      toast.success(response.data?.message || 'Subscription status updated');
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update subscription status');
      console.error('Failed to update subscription status:', error);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.student.registerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.package.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.messFacility.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="bg-blue-50 rounded-lg p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-blue-700">{dashboardStats.totalSubscriptions}</span>
          <span className="text-gray-700 font-medium">Total Subscriptions</span>
        </div>
        <div className="bg-green-50 rounded-lg p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-700">{dashboardStats.activeSubscriptions}</span>
          <span className="text-gray-700 font-medium">Active Subscriptions</span>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-orange-700">{dashboardStats.expiringSubscriptions}</span>
          <span className="text-gray-700 font-medium">Expiring Soon</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <button
          onClick={fetchSubscriptions}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search subscriptions..."
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
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Users</option>
            <option value="STUDENT">Students</option>
            <option value="EMPLOYEE">Employees</option>
          </select>
          <select
            value={messFilter}
            onChange={(e) => setMessFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Mess Facilities</option>
            {messFacilities.map((mess: any) => (
              <option key={mess.id} value={mess.id}>{mess.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSubscriptions.map((subscription, index) => (
          <motion.div
            key={subscription.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{subscription.student.name}</h3>
                  <p className="text-sm text-gray-500">{subscription.student.registerNumber}</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[subscription.status]}`}>
                  {subscription.status}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${userTypeColors[subscription.student.userType]}`}>
                  {subscription.student.userType}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Package:</span>
                <span className="font-medium">{subscription.package.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mess:</span>
                <span className="font-medium">{subscription.messFacility.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold text-green-600">₹{subscription.amountPaid}</span>
              </div>
              {subscription.student.department && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium">{subscription.student.department}</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Start Date:</span>
                <span className="font-medium">{new Date(subscription.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">End Date:</span>
                <span className="font-medium">{new Date(subscription.endDate).toLocaleDateString()}</span>
              </div>
              {subscription.status === 'ACTIVE' && (
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Days Remaining:</span>
                  <span className={`font-bold ${
                    getDaysRemaining(subscription.endDate) <= 7 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {getDaysRemaining(subscription.endDate)} days
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {subscription.package.mealsIncluded.map((meal, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {meal}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => handleView(subscription)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                {canManage && subscription.status === 'ACTIVE' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={async () => {
                        const result = await showConfirm(
                          'Suspend Subscription',
                          `Are you sure you want to suspend ${subscription.student.name}'s subscription?`
                        );
                        if (result.isConfirmed) {
                          await handleStatusUpdate(subscription.id, 'SUSPENDED');
                          showSuccess('Success', 'Subscription suspended successfully');
                        }
                      }}
                      className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                    >
                      Suspend
                    </button>
                  </div>
                )}
                {canManage && subscription.status === 'SUSPENDED' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(subscription.id, 'ACTIVE')}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    >
                      Activate
                    </button>
                    <button
                      onClick={async () => {
                        const result = await showConfirm(
                          'Cancel Subscription',
                          `Are you sure you want to cancel ${subscription.student.name}'s subscription?`
                        );
                        if (result.isConfirmed) {
                          await handleStatusUpdate(subscription.id, 'CANCELLED');
                          showSuccess('Success', 'Subscription cancelled successfully');
                        }
                      }}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredSubscriptions.length === 0 && !loading && (
        <div className="text-center py-12">
          <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter || userTypeFilter ? 'Try adjusting your filters' : 'No subscriptions have been created yet'}
          </p>
        </div>
      )}

      {/* Subscription View Modal */}
      <Modal
        isOpen={!!viewSubscription}
        onClose={() => setViewSubscription(null)}
        title="Subscription Details"
        size="lg"
      >
        {viewSubscription && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Student/Employee</label>
                <p className="text-lg font-semibold">{viewSubscription.student.name}</p>
                <p className="text-sm text-gray-500">{viewSubscription.student.registerNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">User Type</label>
                <span className={`inline-block px-2 py-1 text-sm font-semibold rounded-full ${userTypeColors[viewSubscription.student.userType]}`}>
                  {viewSubscription.student.userType}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Package</label>
                <p className="text-lg">{viewSubscription.package.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mess Facility</label>
                <p className="text-lg">{viewSubscription.messFacility.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-block px-2 py-1 text-sm font-semibold rounded-full ${statusColors[viewSubscription.status]}`}>
                  {viewSubscription.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Amount Paid</label>
                <p className="text-lg font-bold text-green-600">₹{viewSubscription.amountPaid}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Start Date</label>
                <p className="text-lg">{new Date(viewSubscription.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">End Date</label>
                <p className="text-lg">{new Date(viewSubscription.endDate).toLocaleDateString()}</p>
              </div>
              {viewSubscription.student.department && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Department</label>
                  <p className="text-lg">{viewSubscription.student.department}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Meals Included</label>
              <div className="flex flex-wrap gap-2">
                {viewSubscription.package.mealsIncluded.map((meal, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {meal}
                  </span>
                ))}
              </div>
            </div>

            {viewSubscription.status === 'ACTIVE' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Subscription Active</h4>
                <p className="text-sm text-green-700">
                  {getDaysRemaining(viewSubscription.endDate)} days remaining
                </p>
                {getDaysRemaining(viewSubscription.endDate) <= 7 && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ Subscription expires soon
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Subscriptions;