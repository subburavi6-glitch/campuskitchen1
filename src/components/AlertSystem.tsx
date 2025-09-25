import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Package, Calendar, TrendingDown } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Alert {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRY' | 'MOQ';
  message: string;
  item: {
    name: string;
    unit: string;
  };
  createdAt: string;
}

const AlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    // Generate alerts on mount and poll every 30 minutes
    generateStockAlerts();
    const interval = setInterval(() => {
      generateStockAlerts();
      fetchAlerts();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await api.post(`/alerts/${alertId}/dismiss`);
      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast.success('Alert dismissed');
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const generateStockAlerts = async () => {
    setLoading(true);
    try {
      await api.post('/alerts/generate-stock-alerts');
      fetchAlerts();
     // toast.success('Stock alerts generated');
    } catch (error) {
      console.error('Failed to generate alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
      case 'MOQ':
        return <TrendingDown size={16} className="text-red-500" />;
      case 'EXPIRY':
        return <Calendar size={16} className="text-orange-500" />;
      default:
        return <AlertTriangle size={16} className="text-yellow-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
      case 'MOQ':
        return 'border-red-200 bg-red-50';
      case 'EXPIRY':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Alert Bell Button */}
      <button
        onClick={() => setShowAlerts(!showAlerts)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <AlertTriangle size={20} className="text-gray-600" />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {/* Alert Panel */}
      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-0 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden"
          >
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Alerts ({alerts.length})
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={generateStockAlerts}
                    disabled={loading}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Checking...' : 'Check Stock'}
                  </button>
                  <button
                    onClick={() => setShowAlerts(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 border-b border-l-4 ${getAlertColor(alert.type)} hover:bg-opacity-75 transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.item.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {alerts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Package size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No active alerts</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AlertSystem;