import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Building, 
  MapPin, 
  Users, 
  Calendar,
  CreditCard,
  Package,
  Utensils,
  BarChart3,
  Plus,
  Settings
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import MealPlanTab from '../components/mess/MealPlanTab';
import SubscriptionsTab from '../components/mess/SubscriptionsTab';
import PackagesTab from '../components/mess/PackagesTab';
import MenuTab from '../components/mess/MenuTab';
import ReportsTab from '../components/mess/ReportsTab';
import toast from 'react-hot-toast';

interface MessFacility {
  id: string;
  name: string;
  location?: string;
  capacity: number;
  imageUrl?: string;
  active: boolean;
  _count: {
    packages: number;
    subscriptions: number;
  };
}

const MessFacilityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [facility, setFacility] = useState<MessFacility | null>(null);
  const [activeTab, setActiveTab] = useState('meal-plan');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchFacilityDetails();
    }
  }, [id]);

  const fetchFacilityDetails = async () => {
    try {
      const response = await api.get(`/fnb-manager/mess-facilities/${id}`);
      setFacility(response.data);
    } catch (error) {
      console.error('Failed to fetch facility details:', error);
      toast.error('Failed to load facility details');
      navigate('/mess-facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAutoIndent = async () => {
    try {
      await api.post('/fnb-manager/generate-auto-indent');
      toast.success('Auto indent generated for tomorrow');
    } catch (error) {
      console.error('Failed to generate auto indent:', error);
    }
  };

  const tabs = [
    { id: 'meal-plan', label: 'Meal Plan', icon: Calendar },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'menu', label: 'Menu Items', icon: Utensils },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const canManage = user?.role === 'FNB_MANAGER' || user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="text-center py-12">
        <Building size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Facility not found</h3>
        <button
          onClick={() => navigate('/mess-facilities')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Back to Facilities
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/mess-facilities')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              {facility.location && (
                <div className="flex items-center space-x-1">
                  <MapPin size={14} />
                  <span>{facility.location}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Users size={14} />
                <span>Capacity: {facility.capacity}</span>
              </div>
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex space-x-2">
            
            {/* <button
              onClick={() => navigate(`/mess-facilities/${id}/settings`)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button> */}
          </div>
        )}
      </div>

      {/* Facility Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{facility._count.packages}</div>
            <div className="text-blue-100">Active Packages</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{facility._count.subscriptions}</div>
            <div className="text-blue-100">Active Subscriptions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{facility.capacity}</div>
            <div className="text-blue-100">Seating Capacity</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'meal-plan' && <MealPlanTab facilityId={id!} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab facilityId={id!} />}
          {activeTab === 'packages' && <PackagesTab facilityId={id!} />}
          {activeTab === 'menu' && <MenuTab facilityId={id!} />}
          {activeTab === 'reports' && <ReportsTab facilityId={id!} />}
        </div>
      </div>
    </div>
  );
};

export default MessFacilityDetail;