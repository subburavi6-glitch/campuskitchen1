// src/pages/Reports.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  Utensils,
  Star,
  Clock,
  Package,
  MapPin,
  ChefHat,
  Eye,
  Warehouse,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface MealData {
  dishName: string;
  totalPlanned: number;
  subscriptionServed: number;
  subscriptionPercentage: string;
  totalOrders: number;
  orderRevenue: number;
  totalServed: number;
}

interface FacilityReport {
  id: string;
  name: string;
  location: string;
  capacity: number;
  meals: {
    BREAKFAST: MealData;
    LUNCH: MealData;
    SNACKS: MealData;
    DINNER: MealData;
  };
}

interface TodayOverview {
  date: string;
  facilities: FacilityReport[];
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayOverview, setTodayOverview] = useState<TodayOverview | null>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('mess-reports');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'mess-reports') {
      fetchTodayOverview();
    } else if (activeTab === 'inventory-reports') {
      fetchInventoryReports();
    }
  }, [activeTab]);

  const fetchTodayOverview = async () => {
    try {
      const response = await api.get('/reports/today-overview');
      setTodayOverview(response.data);
    } catch (error) {
      console.error('Failed to fetch today overview:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryReports = async () => {
    try {
      const [stockAnalysis, lowStockItems, expiringItems] = await Promise.all([
        api.get('/dashboard/stock-analysis'),
        api.get('/items?filter=low-stock'),
        api.get('/items?filter=expiring')
      ]);
      
      setInventoryStats({
        stockAnalysis: stockAnalysis.data,
        lowStockItems: lowStockItems.data.filter((item: any) => item.totalStock <= item.reorderPoint),
        expiringItems: expiringItems.data.filter((item: any) => item.hasAlerts)
      });
    } catch (error) {
      console.error('Failed to fetch inventory reports:', error);
      toast.error('Failed to load inventory reports');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (messId: string) => {
    navigate(`/reports/mess/${messId}`);
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'BREAKFAST': return '🌅';
      case 'LUNCH': return '🌞';
      case 'SNACKS': return '☕';
      case 'DINNER': return '🌙';
      default: return '🍽️';
    }
  };

  const getMealTime = (mealType: string) => {
    switch (mealType) {
      case 'BREAKFAST': return '07:00 - 10:00';
      case 'LUNCH': return '12:00 - 15:00';
      case 'SNACKS': return '16:00 - 18:00';
      case 'DINNER': return '19:00 - 22:00';
      default: return 'N/A';
    }
  };

  if (user?.role !== 'ADMIN' && user?.role !== 'FNB_MANAGER') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
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

  const overallStats = todayOverview?.facilities.reduce((acc, facility) => {
    Object.values(facility.meals).forEach(meal => {
      acc.totalPlanned += meal.totalPlanned;
      acc.totalServed += meal.totalServed;
      acc.totalOrders += meal.totalOrders;
      acc.totalRevenue += meal.orderRevenue;
    });
    return acc;
  }, { totalPlanned: 0, totalServed: 0, totalOrders: 0, totalRevenue: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive analytics and insights</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/transaction-reports')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <DollarSign size={16} />
            <span>Transaction Reports</span>
          </button>
          <button
            onClick={() => navigate('/reports/comprehensive')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <BarChart3 size={16} />
            <span>Comprehensive Reports</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('mess-reports')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'mess-reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Utensils size={16} />
              <span>Mess Reports</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory-reports')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'inventory-reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Warehouse size={16} />
              <span>Inventory Reports</span>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'mess-reports' && (
        <>
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Today's Mess Overview</h3>
            <p className="text-blue-700 text-sm">{new Date().toLocaleDateString()}</p>
          </div>

          {/* Overall Today Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white"
            >
              <div className="flex items-center">
                <Utensils className="h-8 w-8 mr-3" />
                <div>
                  <p className="text-blue-100">Total Planned</p>
                  <p className="text-2xl font-bold">{overallStats?.totalPlanned.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white"
            >
              <div className="flex items-center">
                <ChefHat className="h-8 w-8 mr-3" />
                <div>
                  <p className="text-green-100">Total Served</p>
                  <p className="text-2xl font-bold">{overallStats?.totalServed.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white"
            >
              <div className="flex items-center">
                <Package className="h-8 w-8 mr-3" />
                <div>
                  <p className="text-purple-100">Individual Orders</p>
                  <p className="text-2xl font-bold">{overallStats?.totalOrders.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white"
            >
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 mr-3" />
                <div>
                  <p className="text-orange-100">Order Revenue</p>
                  <p className="text-2xl font-bold">₹{overallStats?.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Mess Facilities Overview */}
          <div className="space-y-6">
            {todayOverview?.facilities.map((facility, index) => (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Utensils className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{facility.name}</h3>
                        <div className="flex items-center text-gray-500 text-sm mt-1">
                          <MapPin size={14} className="mr-1" />
                          <span>{facility.location}</span>
                          <span className="mx-2">•</span>
                          <Users size={14} className="mr-1" />
                          <span>Capacity: {facility.capacity}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDetails(facility.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Eye size={16} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(facility.meals).map(([mealType, mealData]) => (
                      <div key={mealType} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{getMealIcon(mealType)}</span>
                            <div>
                              <h4 className="font-semibold text-gray-900 capitalize">
                                {mealType.toLowerCase()}
                              </h4>
                              <p className="text-xs text-gray-500">{getMealTime(mealType)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            <strong>Dish:</strong> {mealData.dishName}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white p-2 rounded">
                              <div className="text-gray-500">Planned</div>
                              <div className="font-semibold text-blue-600">
                                {mealData.totalPlanned.toLocaleString()}
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <div className="text-gray-500">Served</div>
                              <div className="font-semibold text-green-600">
                                {mealData.subscriptionServed.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-2 rounded">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500">Completion</span>
                              <span className="font-semibold text-gray-900">
                                {mealData.subscriptionPercentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(parseFloat(mealData.subscriptionPercentage), 100)}%` }}
                              />
                            </div>
                          </div>

                          {mealData.totalOrders > 0 && (
                            <div className="bg-purple-50 p-2 rounded border border-purple-200">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-purple-700">Orders</span>
                                <span className="font-semibold text-purple-900">
                                  {mealData.totalOrders}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-purple-700">Revenue</span>
                                <span className="font-semibold text-purple-900">
                                  ₹{mealData.orderRevenue.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {Object.values(facility.meals).reduce((sum, meal) => sum + meal.totalPlanned, 0)}
                        </div>
                        <div className="text-sm text-gray-500">Total Planned</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {Object.values(facility.meals).reduce((sum, meal) => sum + meal.subscriptionServed, 0)}
                        </div>
                        <div className="text-sm text-gray-500">Subscription Served</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {Object.values(facility.meals).reduce((sum, meal) => sum + meal.totalOrders, 0)}
                        </div>
                        <div className="text-sm text-gray-500">Individual Orders</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          ₹{Object.values(facility.meals).reduce((sum, meal) => sum + meal.orderRevenue, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Order Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'inventory-reports' && (
        <>
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="font-medium text-orange-900 mb-2">Inventory Analytics</h3>
            <p className="text-orange-700 text-sm">Stock levels, alerts, and inventory insights</p>
          </div>

          {inventoryStats && (
            <>
              {/* Inventory Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white"
                >
                  <div className="flex items-center">
                    <Warehouse className="h-8 w-8 mr-3" />
                    <div>
                      <p className="text-blue-100">Total Stock Value</p>
                      <p className="text-2xl font-bold">₹{inventoryStats.stockAnalysis.totalStockValue.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 mr-3" />
                    <div>
                      <p className="text-red-100">Low Stock Items</p>
                      <p className="text-2xl font-bold">{inventoryStats.lowStockItems.length}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white"
                >
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 mr-3" />
                    <div>
                      <p className="text-orange-100">Expiring Items</p>
                      <p className="text-2xl font-bold">{inventoryStats.expiringItems.length}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Stock Analysis Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Value by Category</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(inventoryStats.stockAnalysis.categoryWiseStock || {}).map(([category, data]: [string, any], index) => ({
                          name: category,
                          value: data.value,
                          fill: ['#1c3c80', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Stock Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Low Stock Items */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg shadow p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventoryStats.lowStockItems.slice(0, 10).map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.category.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-red-600">
                              {item.totalStock} {typeof item.unit === 'object' ? item.unit.symbol : item.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.reorderPoint} {typeof item.unit === 'object' ? item.unit.symbol : item.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Low Stock
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;