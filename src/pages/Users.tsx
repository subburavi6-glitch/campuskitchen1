import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, User, Shield, UserCheck, UserX, Edit } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert';
import Modal from '../components/Modal';
import UserForm from '../components/forms/UserForm';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'CHEF' | 'STORE' | 'COOK' | 'VIEWER' | 'FNB_MANAGER' | 'SCANNER';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

const roleColors = {
  ADMIN: 'bg-red-100 text-red-800',
  CHEF: 'bg-orange-100 text-orange-800',
  STORE: 'bg-blue-100 text-blue-800',
  COOK: 'bg-green-100 text-green-800',
  VIEWER: 'bg-gray-100 text-gray-800',
  FNB_MANAGER: 'bg-purple-100 text-purple-800',
  SCANNER: 'bg-indigo-100 text-indigo-800',
};

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-red-100 text-red-800',
};

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showError('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';
    
    const result = await showConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} ${user.name}?`
    );

    if (result.isConfirmed) {
      try {
        await api.put(`/users/${user.id}`, { ...user, status: newStatus });
        showSuccess('Success', `User ${action}d successfully`);
        fetchUsers();
      } catch (error) {
        console.error(`Failed to ${action} user:`, error);
        showError('Error', `Failed to ${action} user`);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const handleFormCancel = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = currentUser?.role === 'ADMIN';

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
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {user.role === 'ADMIN' ? (
                    <Shield size={24} className="text-blue-600" />
                  ) : (
                    <User size={24} className="text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              {user.status === 'ACTIVE' ? (
                <UserCheck size={20} className="text-green-500" />
              ) : (
                <UserX size={20} className="text-red-500" />
              )}
            </div>

            <div className="space-y-2 mb-4">
              {user.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{user.phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Joined:</span>
                <span className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role]}`}>
                {user.role}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[user.status]}`}>
                {user.status}
              </span>
            </div>

            {canManage && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="Edit User"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`text-sm font-medium px-3 py-1 rounded ${
                      user.status === 'ACTIVE'
                        ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                        : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                    }`}
                  >
                    {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first user'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add User
            </button>
          )}
        </div>
      )}

      {/* User Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleFormCancel}
        title={selectedUser ? 'Edit User' : 'Add New User'}
        size="lg"
      >
        <UserForm
          user={selectedUser}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>
    </div>
  );
};

export default Users;