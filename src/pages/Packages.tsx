import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Package, Calendar, DollarSign, Edit, Trash2, Eye, Utensils } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

interface Package {
  id: string;
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  mealsIncluded: string[];
  active: boolean;
  messFacility: {
    name: string;
    location?: string;
  };
  _count: {
    subscriptions: number;
  };
}

const Packages: React.FC = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [messFacilities, setMessFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [viewPackage, setViewPackage] = useState<Package | null>(null);

  useEffect(() => {
    fetchPackages();
    fetchMessFacilities();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await api.get('/fnb-manager/packages');
      setPackages(response.data);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
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

  const handleView = (pkg: Package) => {
    setViewPackage(pkg);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedPackage(null);
    fetchPackages();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedPackage(null);
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.messFacility.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Packages</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add Package</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-500">{pkg.messFacility.name}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                pkg.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {pkg.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {pkg.description && (
              <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
            )}

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
                    onClick={() => handleView(pkg)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <>
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
                    </>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-500">
                  ₹{(pkg.price / pkg.durationDays).toFixed(0)}/day
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredPackages.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first package'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add Package
            </button>
          )}
        </div>
      )}

      {/* Package Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedPackage ? 'Edit Package' : 'Add New Package'}
        size="lg"
      >
        <PackageForm
          package={selectedPackage}
          messFacilities={messFacilities}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Package View Modal */}
      <Modal
        isOpen={!!viewPackage}
        onClose={() => setViewPackage(null)}
        title="Package Details"
        size="lg"
      >
        {viewPackage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Package Name</label>
                <p className="text-xl font-semibold">{viewPackage.name}</p>
              </div>
              {viewPackage.description && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-700">{viewPackage.description}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Mess Facility</label>
                <p className="text-lg">{viewPackage.messFacility.name}</p>
                {viewPackage.messFacility.location && (
                  <p className="text-sm text-gray-500">{viewPackage.messFacility.location}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Duration</label>
                <p className="text-lg font-semibold">{viewPackage.durationDays} days</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Price</label>
                <p className="text-2xl font-bold text-green-600">₹{viewPackage.price}</p>
                <p className="text-sm text-gray-500">₹{(viewPackage.price / viewPackage.durationDays).toFixed(0)} per day</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Active Subscriptions</label>
                <p className="text-lg font-semibold text-purple-600">{viewPackage._count.subscriptions}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Meals Included</label>
              <div className="flex flex-wrap gap-2">
                {viewPackage.mealsIncluded.map((meal, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {meal}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Package Form Component
const PackageForm: React.FC<{
  package?: Package | null;
  messFacilities: any[];
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ package: pkg, messFacilities, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    messFacilityId: pkg?.messFacility?.id || '',
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
      if (pkg) {
        await api.put(`/fnb-manager/packages/${pkg.id}`, formData);
        toast.success('Package updated successfully');
      } else {
        await api.post('/fnb-manager/packages', formData);
        toast.success('Package created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save package:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            onChange={(e) => handleChange('name', e.target.value)}
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
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter package description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mess Facility *
          </label>
          <select
            required
            value={formData.messFacilityId}
            onChange={(e) => handleChange('messFacilityId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Mess Facility</option>
            {messFacilities.map((facility: any) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
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
            onChange={(e) => handleChange('durationDays', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="30"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (₹) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="2500.00"
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
              onChange={(e) => handleChange('active', e.target.checked)}
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

export default Packages;