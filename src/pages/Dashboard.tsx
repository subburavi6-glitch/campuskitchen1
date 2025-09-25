import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  AlertTriangle, 
  ClipboardList, 
  ShoppingCart,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import api from '../utils/api';
import { showError } from '../utils/sweetAlert';

interface DashboardStats {
  totalItems: number;
  lowStockAlerts: number;
  pendingIndents: number;
  openPOs: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entity: string;
  userName: string;
  createdAt: string;
}

interface ExpiringItem {
  itemName: string;
  batchNo: string;
  qty: number;
  unit: any;
  expDate: string;
}

interface TopItem {
  name: string;
  unit: any;
  qty: number;
  value: number;
  unitCost: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockAlerts: 0,
    pendingIndents: 0,
    openPOs: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/overview');
      const { stats, recentActivities, expiringItems, topItems } = response.data;
      
      setStats(stats);
      setRecentActivities(recentActivities);
      setExpiringItems(expiringItems);
      setTopItems(topItems);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      showError('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems,
      icon: Package,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Low Stock Alerts',
      value: stats.lowStockAlerts,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Pending Indents',
      value: stats.pendingIndents,
      icon: ClipboardList,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Open POs',
      value: stats.openPOs,
      icon: ShoppingCart,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} rounded-lg p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userName}</span> {activity.action} {activity.entity}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent activities</p>
            )}
          </div>
        </motion.div>

        {/* Expiring Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Expiring Soon</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {expiringItems.length > 0 ? (
              expiringItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                    <p className="text-xs text-gray-500">Batch: {item.batchNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">
                      {item.qty} {typeof item.unit === 'object' ? (item.unit.symbol ?? item.unit.name ?? '') : item.unit}
                    </p>
                    <p className="text-xs text-red-500">
                      {new Date(item.expDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No items expiring soon</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Items by Value */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <div className="flex items-center mb-4">
          <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Top Items by Stock Value</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                  Item
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                  Quantity
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                  Unit Cost
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                  Total Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topItems.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="text-sm text-gray-900">{item.qty} {item.unit?.symbol || ''}</div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="text-sm text-gray-900">₹{item.unitCost.toFixed(2)}</div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="text-sm font-medium text-green-600">₹{item.value.toFixed(2)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;