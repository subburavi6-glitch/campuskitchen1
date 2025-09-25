// src/pages/MessReport.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Calendar,
  Download,
  Filter,
  Utensils,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Clock,
  MapPin,
  ChefHat
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Area,
  AreaChart
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface MessReportData {
  messFacility: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    imageUrl?: string;
  };
  summary: {
    totalMealsServed: number;
    totalOrders: number;
    servedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    activeSubscriptions: number;
    totalRatings: number;
    averageRating: number;
    satisfactionRate: number;
  };
  dailyStats: Array<{
    date: string;
    subscriptionMeals: number;
    orders: number;
    revenue: number;
    avgRating: number;
  }>;
  mealTypeStats: Array<{
    mealType: string;
    subscriptions: number;
    orders: number;
    total: number;
  }>;
  popularItems: Array<{
    name: string;
    quantity: number;
    orders: number;
    revenue: number;
    unitPrice: number;
  }>;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
  topRatedDishes: Array<{
    name: string;
    average: number;
    count: number;
    mealType: string;
  }>;
  hourlyOrderStats: Array<{
    hour: number;
    count: number;
  }>;
}

const MessReport: React.FC = () => {
  const { messId } = useParams<{ messId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [reportData, setReportData] = useState<MessReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (messId) {
      fetchMessReport();
    }
  }, [messId, dateRange]);

  const fetchMessReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/mess/${messId}`, {
        params: dateRange
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch mess report:', error);
      toast.error('Failed to load mess report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await api.get('/reports/export', {
        params: { ...dateRange, messFacilityId: messId, type: 'comprehensive' }
      });
      const csvContent = convertToCSV(response.data);
      downloadCSV(csvContent, `mess-report-${reportData?.messFacility.name}-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
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

  const COLORS = ['#1c3c80', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (user?.role !== 'ADMIN' && user?.role !== 'FNB_MANAGER') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view reports.</p>
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

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data available for this mess facility.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/reports')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{reportData.messFacility.name}</h1>
            <div className="flex items-center text-gray-600 mt-1">
              <MapPin size={16} className="mr-1" />
              <span>{reportData.messFacility.location}</span>
              <span className="mx-2">•</span>
              <Users size={16} className="mr-1" />
              <span>Capacity: {reportData.messFacility.capacity}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleExportReport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Download size={16} />
          <span>Export Report</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchMessReport}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
            >
              <Filter size={16} />
              <span>Apply Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Meals Served</p>
              <p className="text-3xl font-bold">{reportData.summary.totalMealsServed.toLocaleString()}</p>
            </div>
            <Utensils className="h-8 w-8 text-blue-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Revenue</p>
              <p className="text-3xl font-bold">₹{reportData.summary.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Individual Orders</p>
              <p className="text-3xl font-bold">{reportData.summary.totalOrders.toLocaleString()}</p>
            </div>
            <Package className="h-8 w-8 text-purple-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Average Rating</p>
              <p className="text-3xl font-bold">{reportData.summary.averageRating.toFixed(1)}</p>
            </div>
            <Star className="h-8 w-8 text-yellow-200" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData.dailyStats}>
                <defs>
                  <linearGradient id="colorSubscription" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="subscriptionMeals" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSubscription)" />
                <Area type="monotone" dataKey="orders" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Meal Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Type Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.mealTypeStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mealType" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="subscriptions" fill="#3b82f6" name="Subscriptions" />
                <Bar dataKey="orders" fill="#10b981" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const ratingData = reportData.ratingDistribution.find(r => r.rating === rating);
              const count = ratingData?.count || 0;
              const total = reportData.summary.totalRatings || 1;
              const percentage = (count / total) * 100;
              
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star size={14} className="text-yellow-500" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12">{count}</span>
                  <span className="text-sm text-gray-500 w-12">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportData.summary.satisfactionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Satisfaction Rate (4-5 stars)</div>
            </div>
          </div>
        </motion.div>

        {/* Peak Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Peak Hours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.hourlyOrderStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `${value}:00`}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Popular Items Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Items</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Item Name</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Quantity Sold</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Orders</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Revenue</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Avg Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.popularItems.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div className="font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-medium text-blue-600">{item.quantity}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-gray-900">{item.orders}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-medium text-green-600">₹{item.revenue.toFixed(2)}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-gray-900">₹{item.unitPrice.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Top Rated Dishes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Rated Dishes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportData.topRatedDishes.slice(0, 6).map((dish, index) => (
            <div key={index} className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{dish.name}</span>
                <div className="flex items-center space-x-1">
                  <Star size={16} className="text-yellow-500" />
                  <span className="font-semibold text-gray-900">{dish.average.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span className="capitalize">{dish.mealType.toLowerCase()}</span> • {dish.count} ratings
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default  MessReport;
