import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Package, Calendar, DollarSign, Utensils } from 'lucide-react';
import api from '../../utils/api';
import Modal from '../Modal';
import toast from 'react-hot-toast';

interface Package {
  id: string;
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  mealsIncluded: string[];
  active: boolean;
  _count: {
    subscriptions: number;
  };
}

interface PackagesTabProps {
  facilityId: string;
}

const PackagesTab: React.FC<PackagesTabProps> = ({ facilityId }) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  useEffect(() => {
    fetchPackages();
  }, [facilityId]);

  const fetchPackages = async () => {
    try {
      const response = await api.get('/fnb-manager/packages', {
        params: { messFacilityId: facilityId }
      });
      setPackages(response.data);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowModal(true);
  };

  const handleDelete = async (pkg: Package) => {
    if (pkg._count.subscriptions > 0) {
      toast.error('Cannot delete package with active subscriptions');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${pkg.name}?`)) {
      try {
        await api.delete(`/fnb-manager/packages/${pkg.id}`);
        toast.success('Package deleted successfully');
        fetchPackages();
      } catch (error) {
        console.error('Failed to delete package:', error);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedPackage(null);
    fetchPackages();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Subscription Packages ({packages.length})
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Add Package</span>
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                pkg.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {pkg.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Duration</span>
                </div>
                <span className="font-medium">{pkg.durationDays} days</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Price</span>
                </div>
                <span className="font-bold text-green-600 text-lg">₹{pkg.price}</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Utensils size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Meals</span>
                </div>
                <div className="text-right">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {pkg.mealsIncluded.map((meal, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {meal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Active Subscriptions</span>
                <span className="font-bold text-purple-600">{pkg._count.subscriptions}</span>
              </div>
              
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(pkg)}
                    className="text-green-600 hover:text-green-800 p-1 rounded"
                    title="Edit Package"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg)}
                    className="text-red-600 hover:text-red-800 p-1 rounded"
                    title="Delete Package"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <span className="text-sm font-medium text-gray-500">
                  ₹{(pkg.price / pkg.durationDays).toFixed(0)}/day
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
          <p className="text-gray-500 mb-4">Create your first package to get started</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Package
          </button>
        </div>
      )}

      {/* Package Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedPackage ? 'Edit Package' : 'Add New Package'}
        size="lg"
      >
        <PackageForm
          package={selectedPackage}
          facilityId={facilityId}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

// Package Form Component
const PackageForm: React.FC<{
  package?: Package | null;
  facilityId: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ package: pkg, facilityId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    durationDays: pkg?.durationDays || 30,
    price: pkg?.price || 0,
    mealsIncluded: pkg?.mealsIncluded || [],
    active: pkg?.active ?? true
  });
  const [loading, setLoading] = useState(false);

  const mealOptions = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = { ...formData, messFacilityId: facilityId };
      
      if (pkg) {
        await api.put(`/fnb-manager/packages/${pkg.id}`, data);
        toast.success('Package updated successfully');
      } else {
        await api.post('/fnb-manager/packages', data);
        toast.success('Package created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save package:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMeal = (meal: string) => {
    setFormData(prev => ({
      ...prev,
      mealsIncluded: prev.mealsIncluded.includes(meal)
        ? prev.mealsIncluded.filter(m => m !== meal)
        : [...prev.mealsIncluded, meal]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Package Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter package name"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter package description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (Days) *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.durationDays}
            onChange={(e) => setFormData(prev => ({ ...prev, durationDays: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (₹) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meals Included *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {mealOptions.map(meal => (
              <label key={meal} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mealsIncluded.includes(meal)}
                  onChange={() => toggleMeal(meal)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{meal}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Active Package
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : pkg ? 'Update Package' : 'Create Package'}
        </button>
      </div>
    </form>
  );
};

export default PackagesTab;