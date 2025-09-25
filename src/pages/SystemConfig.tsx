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
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/system-config');
      const fetchedSettings = response.data;
      
      // Merge with default settings
      const mergedSettings = systemSettings.map(defaultSetting => {
        const fetchedSetting = fetchedSettings.find((s: any) => s.key === defaultSetting.key);
        return {
          ...defaultSetting,
          value: fetchedSetting?.value || defaultSetting.value
        };
      });
      
      setSettings(mergedSettings);
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
        await api.post('/system-config/bulk-update', { settings });
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
    </div>
  );
};

export default SystemConfig;