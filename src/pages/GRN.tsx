import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Package, FileCheck, Edit, Trash2, Eye, Printer } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import GRNForm from '../components/forms/GRNForm';
import toast from 'react-hot-toast';

interface GRN {
  id: string;
  grnNo: string;
  invoiceNo?: string;
  receivedAt: string;
  po: {
    poNo: string;
    vendor: { name: string };
  };
  receiver: { name: string };
  items: Array<{
  item: { name: string; unit: any };
    receivedQty: number;
    unitCost: number;
    batchNo: string;
  }>;
}

const GRN: React.FC = () => {
  const { user } = useAuth();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [viewGRN, setViewGRN] = useState<GRN | null>(null);

  useEffect(() => {
    fetchGRNs();
  }, []);

  const fetchGRNs = async () => {
    try {
      const response = await api.get('/grn');
      setGrns(response.data);
    } catch (error) {
      console.error('Failed to fetch GRNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (grn: GRN) => {
    setSelectedGRN(grn);
    setShowModal(true);
  };

  const handleDelete = async (grn: GRN) => {
    if (window.confirm(`Are you sure you want to delete GRN ${grn.grnNo}?`)) {
      try {
        await api.delete(`/grn/${grn.id}`);
        toast.success('GRN deleted successfully');
        fetchGRNs();
      } catch (error) {
        console.error('Failed to delete GRN:', error);
      }
    }
  };

  const handleView = (grn: GRN) => {
    setViewGRN(grn);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedGRN(null);
    fetchGRNs();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedGRN(null);
  };

  const handlePrint = (grn: GRN) => {
    printDocument(api, `/grn/${grn.id}/print`, 'grn');
  };

  const filteredGRNs = grns.filter(grn =>
    grn.grnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.po.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.po.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = user?.role === 'STORE';

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
        <h1 className="text-2xl font-bold text-gray-900">Goods Receipt Notes</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Create GRN</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search GRNs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* GRN Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredGRNs.map((grn, index) => (
          <motion.div
            key={grn.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{grn.grnNo}</h3>
                  <p className="text-sm text-gray-500">PO: {grn.po.poNo}</p>
                </div>
              </div>
              <FileCheck size={20} className="text-green-500" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Vendor:</span>
                <span className="font-medium">{grn.po.vendor.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Received by:</span>
                <span className="font-medium">{grn.receiver.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Received on:</span>
                <span className="font-medium">
                  {new Date(grn.receivedAt).toLocaleDateString()}
                </span>
              </div>
              {grn.invoiceNo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-medium">{grn.invoiceNo}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Items Received</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
        {grn.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.item.name}</span>
                    <span className="font-medium">
          {item.receivedQty} {typeof item.item.unit === 'object' ? (item.item.unit.symbol ?? item.item.unit.name ?? '') : item.item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleView(grn)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleEdit(grn)}
                        className="text-green-600 hover:text-green-800 p-1 rounded"
                        title="Edit GRN"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(grn)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        title="Delete GRN"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handlePrint(grn)}
                    className="text-gray-600 hover:text-gray-800 p-1 rounded"
                    title="Print GRN"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredGRNs.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No GRNs found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'No goods have been received yet'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create GRN
            </button>
          )}
        </div>
      )}

      {/* GRN Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedGRN ? 'Edit GRN' : 'Create GRN'}
        size="xl"
      >
        <GRNForm
          grn={selectedGRN}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* GRN View Modal */}
      <Modal
        isOpen={!!viewGRN}
        onClose={() => setViewGRN(null)}
        title="GRN Details"
        size="xl"
      >
        {viewGRN && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">GRN Number</label>
                <p className="text-lg font-semibold">{viewGRN.grnNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">PO Number</label>
                <p className="text-lg">{viewGRN.po.poNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Vendor</label>
                <p className="text-lg">{viewGRN.po.vendor.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Received By</label>
                <p className="text-lg">{viewGRN.receiver.name}</p>
              </div>
              {viewGRN.invoiceNo && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Invoice Number</label>
                  <p className="text-lg">{viewGRN.invoiceNo}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Received Date</label>
                <p className="text-lg">{new Date(viewGRN.receivedAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Items Received</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewGRN.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.batchNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.receivedQty} {typeof item.item.unit === 'object' ? (item.item.unit.symbol ?? item.item.unit.name ?? '') : item.item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{item.unitCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{(item.receivedQty * item.unitCost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GRN;