import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Send, Package, Eye, Edit } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import IssueForm from '../components/forms/IssueForm';
import toast from 'react-hot-toast';

interface Issue {
  id: string;
  issuedAt: string;
  indent: {
    meal: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
    requestedForDate: string;
    requester: { name: string };
  };
  issuer: { name: string };
  items: Array<{
    item: { name: string; unit: string | { symbol?: string; name?: string } };
    batch: { batchNo: string };
    qty: number;
  }>;
}

const mealColors = {
  BREAKFAST: 'bg-orange-100 text-orange-800',
  LUNCH: 'bg-green-100 text-green-800',
  SNACKS: 'bg-purple-100 text-purple-800',
  DINNER: 'bg-blue-100 text-blue-800',
};

const Issues: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [viewIssue, setViewIssue] = useState<Issue | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await api.get('/issues');
      setIssues(response.data);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (issue: Issue) => {
    setSelectedIssue(issue);
    setShowModal(true);
  };

  const handleView = (issue: Issue) => {
    setViewIssue(issue);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedIssue(null);
    fetchIssues();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedIssue(null);
  };

  const filteredIssues = issues.filter(issue =>
    issue.indent.requester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.indent.meal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.issuer.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">Stock Issues</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Create Issue</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredIssues.map((issue, index) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Send size={24} className="text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${mealColors[issue.indent.meal]}`}>
                      {issue.indent.meal}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">to {issue.indent.requester.name}</p>
                </div>
              </div>
              <Package size={20} className="text-green-500" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Issued by:</span>
                <span className="font-medium">{issue.issuer.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Issued on:</span>
                <span className="font-medium">
                  {new Date(issue.issuedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">For date:</span>
                <span className="font-medium">
                  {new Date(issue.indent.requestedForDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Items Issued ({issue.items.length})</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {issue.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-900">{item.item.name}</span>
                      <span className="text-gray-500 ml-1">({item.batch.batchNo})</span>
                    </div>
                    <span className="font-medium">
                      {item.qty} {typeof item.item.unit === 'object' ? (item.item.unit.symbol ?? item.item.unit.name ?? '') : item.item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleView(issue)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <button
                      onClick={() => handleEdit(issue)}
                      className="text-green-600 hover:text-green-800 p-1 rounded"
                      title="Edit Issue"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                </div>
                <span className="text-sm font-medium text-green-600">
                  Issued Successfully
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredIssues.length === 0 && !loading && (
        <div className="text-center py-12">
          <Send size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'No stock has been issued yet'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create Issue
            </button>
          )}
        </div>
      )}

      {/* Issue Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedIssue ? 'Edit Issue' : 'Create Issue'}
        size="xl"
      >
        <IssueForm
          issue={selectedIssue}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Issue View Modal */}
      <Modal
        isOpen={!!viewIssue}
        onClose={() => setViewIssue(null)}
        title="Issue Details"
        size="lg"
      >
        {viewIssue && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Meal</label>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${mealColors[viewIssue.indent.meal]}`}>
                  {viewIssue.indent.meal}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Issued By</label>
                <p className="text-lg">{viewIssue.issuer.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Issued To</label>
                <p className="text-lg">{viewIssue.indent.requester.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Issue Date</label>
                <p className="text-lg">{new Date(viewIssue.issuedAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Items Issued</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewIssue.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.batch.batchNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.qty} {typeof item.item.unit === 'object' ? (item.item.unit.symbol ?? item.item.unit.name ?? '') : item.item.unit}
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

export default Issues;