import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Building, Phone, Mail, Edit, Trash2, Eye } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import VendorForm from '../components/forms/VendorForm';
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert';

interface Vendor {
  id: string;
  name: string;
  category: { name: string };
  phone?: string;
  email?: string;
  address?: string;
  gstNo?: string;
  _count: {
    items: number;
    purchaseOrders: number;
  };
}

const Vendors: React.FC = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response.data);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      showError('Error', 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowModal(true);
  };

  const handleDelete = async (vendor: Vendor) => {
    const result = await showConfirm(
      'Delete Vendor',
      `Are you sure you want to delete ${vendor.name}?`
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/vendors/${vendor.id}`);
        showSuccess('Success', 'Vendor deleted successfully');
        fetchVendors();
      } catch (error) {
        console.error('Failed to delete vendor:', error);
        showError('Error', 'Failed to delete vendor');
      }
    }
  };

  const handleView = (vendor: Vendor) => {
    setViewVendor(vendor);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedVendor(null);
    fetchVendors();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedVendor(null);
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm) ||
    vendor.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = user?.role === 'ADMIN' || user?.role === 'STORE';

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
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add Vendor</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor, index) => (
          <motion.div
            key={vendor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                  <p className="text-sm text-gray-500">{vendor.category.name}</p>
                  {vendor.gstNo && (
                    <p className="text-sm text-gray-500">GST: {vendor.gstNo}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {vendor.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone size={16} />
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail size={16} />
                  <span>{vendor.email}</span>
                </div>
              )}
              {vendor.address && (
                <p className="text-sm text-gray-600">{vendor.address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{vendor._count.items}</p>
                <p className="text-xs text-gray-500">Items</p>
              </div>
              <div className="text-center">
                 <p className="text-2xl font-bold text-green-600">{vendor._count.purchaseOrders}</p>
                <p className="text-xs text-gray-500">Pending Purchase Orders</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleView(vendor)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="text-green-600 hover:text-green-800 p-1 rounded"
                        title="Edit Vendor"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        title="Delete Vendor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredVendors.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first vendor'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add Vendor
            </button>
          )}
        </div>
      )}

      {/* Vendor Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedVendor ? 'Edit Vendor' : 'Add  Vendor'}
        size="lg"
      >
        <VendorForm
          vendor={selectedVendor}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Vendor View Modal */}
      <Modal
        isOpen={!!viewVendor}
        onClose={() => setViewVendor(null)}
        title="Vendor Details"
        size="lg"
      >
        {viewVendor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Vendor Name</label>
                <p className="text-xl font-semibold">{viewVendor.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Category</label>
                <p className="text-lg">{viewVendor.category.name}</p>
              </div>
              {viewVendor.gstNo && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">GST Number</label>
                  <p className="text-lg">{viewVendor.gstNo}</p>
                </div>
              )}
              {viewVendor.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg">{viewVendor.phone}</p>
                </div>
              )}
              {viewVendor.email && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg">{viewVendor.email}</p>
                </div>
              )}
              {viewVendor.address && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Address</label>
                  <p className="text-lg">{viewVendor.address}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{viewVendor._count.items}</p>
                <p className="text-sm text-gray-500">Items Supplied</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{viewVendor._count.purchaseOrders}</p>
                <p className="text-sm text-gray-500">Purchase Orders</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Vendors;