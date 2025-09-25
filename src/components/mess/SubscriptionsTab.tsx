import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Search, Filter, CreditCard, Calendar, User, Eye, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import Modal from '../Modal';
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
    department?: string;
  };
  package: {
    name: string;
    mealsIncluded: string[];
  };
  createdAt: string;
}

interface SubscriptionsTabProps {
  facilityId: string;
}

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ facilityId }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewSubscription, setViewSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [facilityId, statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      const params: any = { messFacilityId: facilityId };
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/fnb-manager/subscriptions', { params });
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/fnb-manager/export-subscriptions', {
        params: { messFacilityId: facilityId }
      });
      const csvContent = convertToCSV(response.data);
      downloadCSV(csvContent, `subscriptions-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Subscriptions exported successfully');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.student.registerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.package.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Subscriptions ({filteredSubscriptions.length})
          </h3>
          <button
            onClick={fetchSubscriptions}
            className="text-blue-600 hover:text-blue-800 p-1 rounded"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
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
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student/Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {subscription.student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {subscription.student.registerNumber}
                      </div>
                      <div className="text-xs text-gray-400">
                        {subscription.student.userType} {subscription.student.department && `• ${subscription.student.department}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{subscription.package.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {subscription.package.mealsIncluded.map((meal, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {meal}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(subscription.startDate).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">
                      to {new Date(subscription.endDate).toLocaleDateString()}
                    </div>
                    {subscription.status === 'ACTIVE' && (
                      <div className={`text-xs font-medium mt-1 ${
                        getDaysRemaining(subscription.endDate) <= 7 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {getDaysRemaining(subscription.endDate)} days left
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">₹{subscription.amountPaid}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[subscription.status]}`}>
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setViewSubscription(subscription)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter ? 'Try adjusting your filters' : 'No subscriptions for this facility yet'}
            </p>
          </div>
        )}
      </div>

      {/* Subscription Details Modal */}
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
                <span className="inline-block px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                  {viewSubscription.student.userType}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Package</label>
                <p className="text-lg">{viewSubscription.package.name}</p>
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
                <label className="block text-sm font-medium text-gray-500">Duration</label>
                <p className="text-lg">{new Date(viewSubscription.startDate).toLocaleDateString()} - {new Date(viewSubscription.endDate).toLocaleDateString()}</p>
              </div>
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
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SubscriptionsTab;