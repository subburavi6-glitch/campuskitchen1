import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Building, MapPin, Users, Edit, Trash2, Eye, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
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

const MessFacilities: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<MessFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<MessFacility | null>(null);
  const [viewFacility, setViewFacility] = useState<MessFacility | null>(null);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await api.get('/fnb-manager/mess-facilities');
      setFacilities(response.data);
    } catch (error) {
      console.error('Failed to fetch mess facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (facility: MessFacility) => {
    setSelectedFacility(facility);
    setShowModal(true);
  };

  const handleDelete = async (facility: MessFacility) => {
    if (facility._count.subscriptions > 0) {
      toast.error('Cannot delete facility with active subscriptions');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${facility.name}?`)) {
      try {
        await api.delete(`/fnb-manager/mess-facilities/${facility.id}`);
        toast.success('Mess facility deleted successfully');
        fetchFacilities();
      } catch (error) {
        console.error('Failed to delete facility:', error);
      }
    }
  };

  const handleView = (facility: MessFacility) => {
    navigate(`/mess-facilities/${facility.id}`);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedFacility(null);
    fetchFacilities();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedFacility(null);
  };

  const filteredFacilities = facilities.filter(facility =>
    facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.location?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">Mess Facilities</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add Facility</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search facilities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFacilities.map((facility, index) => (
          <motion.div
            key={facility.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
          >
            {facility.imageUrl ? (
              <img
                src={facility.imageUrl}
                alt={facility.name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Building size={48} className="text-white" />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{facility.name}</h3>
                  {facility.location && (
                    <div className="flex items-center text-gray-500 text-sm mt-1">
                      <MapPin size={14} className="mr-1" />
                      <span>{facility.location}</span>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  facility.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {facility.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users size={16} className="text-blue-600" />
                  </div>
                  <p className="text-lg font-bold text-blue-600">{facility.capacity}</p>
                  <p className="text-xs text-gray-500">Capacity</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{facility._count.packages}</p>
                  <p className="text-xs text-gray-500">Packages</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">{facility._count.subscriptions}</p>
                  <p className="text-xs text-gray-500">Subscriptions</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewFacility(facility);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleView(facility)}
                      className="text-green-600 hover:text-green-800 p-1 rounded"
                      title="Manage Facility"
                    >
                      <ArrowRight size={16} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => handleEdit(facility)}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Edit Facility"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(facility)}
                          className="text-red-600 hover:text-red-800 p-1 rounded"
                          title="Delete Facility"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredFacilities.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No mess facilities found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first mess facility'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add Facility
            </button>
          )}
        </div>
      )}

      {/* Facility Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedFacility ? 'Edit Mess Facility' : 'Add New Mess Facility'}
        size="lg"
      >
        <MessFacilityForm
          facility={selectedFacility}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Facility View Modal */}
      <Modal
        isOpen={!!viewFacility}
        onClose={() => setViewFacility(null)}
        title="Mess Facility Details"
        size="lg"
      >
        {viewFacility && (
          <div className="space-y-4">
            {viewFacility.imageUrl && (
              <div className="text-center">
                <img
                  src={viewFacility.imageUrl}
                  alt={viewFacility.name}
                  className="max-h-48 mx-auto rounded-lg"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Facility Name</label>
                <p className="text-xl font-semibold">{viewFacility.name}</p>
              </div>
              {viewFacility.location && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Location</label>
                  <p className="text-lg">{viewFacility.location}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Capacity</label>
                <p className="text-lg font-semibold text-blue-600">{viewFacility.capacity} people</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-block px-2 py-1 text-sm font-semibold rounded-full ${
                  viewFacility.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {viewFacility.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{viewFacility._count.packages}</p>
                <p className="text-sm text-gray-500">Available Packages</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{viewFacility._count.subscriptions}</p>
                <p className="text-sm text-gray-500">Active Subscriptions</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Mess Facility Form Component
const MessFacilityForm: React.FC<{
  facility?: MessFacility | null;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ facility, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: facility?.name || '',
    location: facility?.location || '',
    capacity: facility?.capacity || 0,
    imageUrl: facility?.imageUrl || '',
    active: facility?.active ?? true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (facility) {
        await api.put(`/fnb-manager/mess-facilities/${facility.id}`, formData);
        toast.success('Mess facility updated successfully');
      } else {
        await api.post('/fnb-manager/mess-facilities', formData);
        toast.success('Mess facility created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save mess facility:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Facility Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter facility name"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter facility location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capacity *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.capacity}
            onChange={(e) => handleChange('capacity', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter seating capacity"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL
          </label>
          <input
            type="url"
            value={formData.imageUrl}
            onChange={(e) => handleChange('imageUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter image URL"
          />
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
              Active Facility
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
          {loading ? 'Saving...' : facility ? 'Update Facility' : 'Create Facility'}
        </button>
      </div>
    </form>
  );
};

export default MessFacilities;