import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { showSuccess, showError } from '../../utils/sweetAlert';

interface VendorFormProps {
  vendor?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface VendorFormData {
  name: string;
  categoryId: string;
  gstNo?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const VendorForm: React.FC<VendorFormProps> = ({ vendor, onSuccess, onCancel }) => {
  const [vendorCategories, setVendorCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<VendorFormData>({
    defaultValues: {
      name: '',
      categoryId: '',
      gstNo: '',
      phone: '',
      email: '',
      address: ''
    }
  });

  useEffect(() => {
    fetchVendorCategories();
  }, []);

  // Reset form with vendor data after categories are loaded
  useEffect(() => {
    if (categoriesLoaded && vendor) {
      reset({
        name: vendor.name || '',
        categoryId: vendor.categoryId || '',
        gstNo: vendor.gstNo || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || ''
      });
    } else if (categoriesLoaded && !vendor) {
      // Reset form for new vendor creation
      reset({
        name: '',
        categoryId: '',
        gstNo: '',
        phone: '',
        email: '',
        address: ''
      });
    }
  }, [categoriesLoaded, vendor, reset]);

  const fetchVendorCategories = async () => {
    try {
      const response = await api.get('/admin-config/vendor-categories');
      const activeCategories = response.data.filter((cat: any) => cat.active);
      setVendorCategories(activeCategories);
      setCategoriesLoaded(true);
    
    } catch (error) {
      console.error('Failed to fetch vendor categories:', error);
      setCategoriesLoaded(true); // Set to true even on error to prevent infinite loading
    }
  };

  const onSubmit = async (data: VendorFormData) => {
    setLoading(true);
    try {
      if (vendor) {
        await api.put(`/vendors/${vendor.id}`, data);
        showSuccess('Success', 'Vendor updated successfully');
      } else {
        await api.post('/vendors', data);
        showSuccess('Success', 'Vendor created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save vendor:', error);
      showError('Error', 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vendor Name *
          </label>
          <input
            {...register('name', { required: 'Vendor name is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter vendor name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            {...register('categoryId', { required: 'Category is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!categoriesLoaded}
          >
            <option value="">
              {categoriesLoaded ? 'Select Category' : 'Loading categories...'}
            </option>
            {vendorCategories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GST Number
          </label>
          <input
            {...register('gstNo', {
              
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter GST number (optional)"
          />
          {errors.gstNo && (
            <p className="mt-1 text-sm text-red-600">{errors.gstNo.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            {...register('phone', {
              required: 'Phone number is required',
              pattern: {
                value: /^[6-9]\d{9}$/,
                message: 'Phone number must be 10 digits starting with 6-9'
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter phone number"
            maxLength={10}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            {...register('email', {
              validate: value => {
                if (!value || value.trim() === '') return true;
                const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                return emailRegex.test(value) || 'Invalid email address';
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter email address (optional)"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <textarea
            {...register('address', { required: 'Address is required' })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter vendor address"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
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
          disabled={loading || !categoriesLoaded}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
        </button>
      </div>
    </form>
  );
};

export default VendorForm;
