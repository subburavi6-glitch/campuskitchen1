import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { showSuccess, showError } from '../../utils/sweetAlert';

interface UserFormProps {
  user?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'CHEF' | 'STORE' | 'COOK' | 'VIEWER' | 'FNB_MANAGER' | 'SCANNER';
  messFacilityId?: string;
  password?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const UserForm: React.FC<UserFormProps> = ({ user, onSuccess, onCancel }) => {


  const [loading, setLoading] = useState(false);
  const [messFacilities, setMessFacilities] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await api.get('/fnb-manager/mess-facilities');
        // Only show active facilities
        setMessFacilities(
          response.data.filter((f: any) => f.active).map((f: any) => ({ id: f.id, name: f.name }))
        );
      } catch (error) {
        showError('Error', 'Failed to fetch mess facilities');
      }
    };
    fetchFacilities();
  }, []);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<UserFormData>({
    defaultValues: user ? {
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      messFacilityId: user.messFacilityId || ''
    } : {
      name: '',
      email: '',
      phone: '',
      role: 'VIEWER',
      password: '',
      status: 'ACTIVE',
      messFacilityId: ''
    }
  });

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      if (user) {
        await api.put(`/users/${user.id}`, data);
        showSuccess('Success', 'User updated successfully');
      } else {
        if (data.role === 'SCANNER') {
          if (!data.messFacilityId) {
            showError('Error', 'Mess Facility is required for Scanner');
            setLoading(false);
            return;
          }
          await api.post('/auth/create-scanner', data);
          showSuccess('Success', 'Scanner created successfully');
        } else {
          await api.post('/users', data);
          showSuccess('Success', 'User created successfully');
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save user:', error);
      showError('Error', 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
          <input
            {...register('name', { required: 'Name is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
          <input
            type="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter email address"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            {...register('phone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
          <select
            {...register('role', { required: 'Role is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="VIEWER">Viewer</option>
            <option value="COOK">Cook</option>
            <option value="CHEF">Chef</option>
            <option value="STORE">Store Manager</option>
            <option value="ADMIN">Administrator</option>
            <option value="FNB_MANAGER">FNB Manager</option>
            <option value="SCANNER">Scanner</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>

        {/* Mess Facility for SCANNER */}
        {watch('role') === 'SCANNER' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Mess Facility *</label>
            <select
              {...register('messFacilityId', { required: 'Mess Facility is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Mess Facility</option>
              {messFacilities.map(facility => (
                <option key={facility.id} value={facility.id}>{facility.name}</option>
              ))}
            </select>
            {errors.messFacilityId && (
              <p className="mt-1 text-sm text-red-600">{errors.messFacilityId.message}</p>
            )}
          </div>
        )}

        {/* Password field only for new user */}
        {!user && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
            <input
              type="password"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
          <select
            {...register('status', { required: 'Status is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">Role Permissions:</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p><strong>Admin:</strong> Full system access</p>
          <p><strong>Chef:</strong> Menu planning, dish management, indent approval</p>
          <p><strong>Store:</strong> Inventory, purchase orders, GRN, stock issues</p>
          <p><strong>Cook:</strong> Create indents, view meal plans</p>
          <p><strong>FNB Manager:</strong> Mess facilities, packages, subscriptions</p>
          <p><strong>Scanner:</strong> QR scanning only (dedicated device)</p>
          <p><strong>Viewer:</strong> Read-only access to all modules</p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
