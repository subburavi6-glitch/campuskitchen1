import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RotateCcw } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert';

interface SystemSetting {
  key: string;
  value: string;
  category: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  description?: string;
}

const SystemConfig: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const systemSettings: SystemSetting[] = [
    {
      key: 'auto_po_enabled',
      value: 'false',
      category: 'purchase',
      label: 'Auto Purchase Orders',
      type: 'boolean',
      description: 'Automatically generate purchase orders for low stock items'
    },
    {
      key: 'default_tax_rate',
      value: '18',
      category: 'finance',
      label: 'Default Tax Rate (%)',
      type: 'number',
      description: 'Default GST rate for purchase orders'
    },
    {
      key: 'notification_type',
      value: 'sweetalert',
      category: 'ui',
      label: 'Notification System',
      type: 'select',
      options: ['sweetalert', 'toast'],
      description: 'Type of notifications to show users'
    },
    {
      key: 'reorder_alert_days',
      value: '7',
      category: 'inventory',
      label: 'Reorder Alert Days',
      type: 'number',
      description: 'Days before expiry to show reorder alerts'
    },
    {
      key: 'max_po_value',
      value: '100000',
      category: 'purchase',
      label: 'Maximum PO Value (₹)',
      type: 'number',
      description: 'Maximum value allowed for a single purchase order'
    },
    {
      key: 'meal_rating_window',
      value: '30',
      category: 'meals',
      label: 'Rating Window (minutes)',
      type: 'number',
      description: 'Time window after meal to allow ratings'
    }
    {
      key: 'meal_attendance_mandatory',
      value: 'false',
      category: 'meals',
      label: 'Mandatory Meal Attendance',
      type: 'boolean',
      description: 'Require students to mark attendance before allowing mess entry'
    },
    {
      key: 'attendance_reminder_start',
      value: '15:00',
      category: 'meals',
      label: 'Reminder Start Time',
      type: 'text',
      description: 'Time to start sending meal attendance reminders (HH:MM)'
    },
    {
      key: 'attendance_cutoff_time',
      value: '23:00',
      category: 'meals',
      label: 'Attendance Cutoff Time',
      type: 'text',
      description: 'Time after which students cannot mark attendance (HH:MM)'
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [configResponse, attendanceResponse, gatewayResponse] = await Promise.all([
        api.get('/system-config'),
        api.get('/system-config/meal-attendance-settings'),
        api.get('/system-config/payment-gateways').catch(() => ({ data: [] }))
      ]);
      
      const fetchedSettings = configResponse.data;
      const attendanceSettings = attendanceResponse.data;
      const paymentGateways = gatewayResponse.data;
      
      // Merge with default settings
      const mergedSettings = systemSettings.map(defaultSetting => {
        const fetchedSetting = fetchedSettings.find((s: any) => s.key === defaultSetting.key);
        
        // Handle meal attendance settings
        if (defaultSetting.key === 'meal_attendance_mandatory') {
          return { ...defaultSetting, value: attendanceSettings.isMandatory?.toString() || 'false' };
        }
        if (defaultSetting.key === 'attendance_reminder_start') {
          return { ...defaultSetting, value: attendanceSettings.reminderStartTime || '15:00' };
        }
        if (defaultSetting.key === 'attendance_cutoff_time') {
          return { ...defaultSetting, value: attendanceSettings.cutoffTime || '23:00' };
        }
        
        return {
          ...defaultSetting,
          value: fetchedSetting?.value || defaultSetting.value
        };
      });
      
      setSettings(mergedSettings);
      setPaymentGateways(paymentGateways);
    } catch (error) {
      showError('Error', 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
  };

  const handleSave = async () => {
    const result = await showConfirm(
      'Save Settings',
      'Are you sure you want to save these system settings?'
    );

    if (result.isConfirmed) {
      setSaving(true);
      try {
        // Save regular settings
        const regularSettings = settings.filter(s => 
          !['meal_attendance_mandatory', 'attendance_reminder_start', 'attendance_cutoff_time'].includes(s.key)
        );
        
        if (regularSettings.length > 0) {
          await api.post('/system-config/bulk-update', { settings: regularSettings });
        }

        // Save meal attendance settings
        const attendanceSettings = {
          isMandatory: settings.find(s => s.key === 'meal_attendance_mandatory')?.value === 'true',
          reminderStartTime: settings.find(s => s.key === 'attendance_reminder_start')?.value || '15:00',
          reminderEndTime: settings.find(s => s.key === 'attendance_reminder_end')?.value || '22:00',
          cutoffTime: settings.find(s => s.key === 'attendance_cutoff_time')?.value || '23:00'
        };
        
        await api.post('/system-config/meal-attendance-settings', attendanceSettings);

        showSuccess('Success', 'System settings saved successfully');
      } catch (error) {
        showError('Error', 'Failed to save system settings');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleReset = async () => {
    const result = await showConfirm(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?'
    );

    if (result.isConfirmed) {
      setSettings(systemSettings);
      showSuccess('Success', 'Settings reset to default values');
    }
  };

  const [paymentGateways, setPaymentGateways] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);

  const handleSavePaymentGateway = async (gatewayData) => {
    try {
      await api.post('/system-config/payment-gateways', gatewayData);
      showSuccess('Success', 'Payment gateway saved successfully');
      setShowPaymentModal(false);
      setSelectedGateway(null);
      fetchSettings();
    } catch (error) {
      showError('Error', 'Failed to save payment gateway');
    }
  };

  const groupedSettings = settings.reduce((groups, setting) => {
    if (!groups[setting.category]) {
      groups[setting.category] = [];
    }
    groups[setting.category].push(setting);
    return groups;
  }, {} as Record<string, SystemSetting[]>);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to access system configuration.</p>
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleReset}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Settings by Category */}
      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 capitalize">
              {category} Settings
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            {categorySettings.map((setting) => (
              <div key={setting.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {setting.label}
                  </label>
                  {setting.description && (
                    <p className="text-xs text-gray-500">{setting.description}</p>
                  )}
                </div>
                
                <div>
                  {setting.type === 'boolean' ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.value === 'true'}
                        onChange={(e) => handleSettingChange(setting.key, e.target.checked.toString())}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  ) : setting.type === 'select' ? (
                    <select
                      value={setting.value}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {setting.options?.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={setting.type}
                      value={setting.value}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Payment Gateways Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Payment Gateways</h2>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Add Gateway
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentGateways.map((gateway: any) => (
              <div key={gateway.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{gateway.name}</h4>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    gateway.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {gateway.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Type: {gateway.type}</p>
                  <p>Environment: {gateway.environment}</p>
                  <p>Key ID: {gateway.keyId.substring(0, 10)}...</p>
                </div>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedGateway(gateway);
                      setShowPaymentModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      const result = await showConfirm('Delete Gateway', 'Are you sure?');
                      if (result.isConfirmed) {
                        await api.delete(`/system-config/payment-gateways/${gateway.id}`);
                        fetchSettings();
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Payment Gateway Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {selectedGateway ? 'Edit' : 'Add'} Payment Gateway
            </h3>
            <PaymentGatewayForm
              gateway={selectedGateway}
              onSave={handleSavePaymentGateway}
              onCancel={() => {
                setShowPaymentModal(false);
                setSelectedGateway(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Payment Gateway Form Component
const PaymentGatewayForm: React.FC<{
  gateway?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ gateway, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: gateway?.name || '',
    type: gateway?.type || 'RAZORPAY',
    environment: gateway?.environment || 'TEST',
    keyId: gateway?.keyId || '',
    keySecret: gateway?.keySecret || '',
    webhookSecret: gateway?.webhookSecret || '',
    active: gateway?.active ?? false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: gateway?.id });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="RAZORPAY">Razorpay</option>
            <option value="PAYU">PayU</option>
            <option value="STRIPE">Stripe</option>
            <option value="PHONEPE">PhonePe</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
          <select
            value={formData.environment}
            onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="TEST">Test</option>
            <option value="LIVE">Live</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Key ID</label>
        <input
          type="text"
          required
          value={formData.keyId}
          onChange={(e) => setFormData(prev => ({ ...prev, keyId: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Key Secret</label>
        <input
          type="password"
          required
          value={formData.keySecret}
          onChange={(e) => setFormData(prev => ({ ...prev, keySecret: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
        <input
          type="password"
          value={formData.webhookSecret}
          onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.active}
          onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-700">Active Gateway</label>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
        >
          Save Gateway
        </button>
      </div>
    </form>
  );
};

export default SystemConfig;