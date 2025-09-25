import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X } from 'lucide-react';
import api from '../../utils/api';
import { showSuccess, showError } from '../../utils/sweetAlert';
import { SERVERURL } from '../../utils/paths';

interface ItemFormProps {
  item?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ItemFormData {
  name: string;
  sku: string;
  unitId: string;
  categoryId: string;
  vendorId?: string;
  storageTypeId?: string;
  moq: number;
  reorderPoint: number;
  perishable: boolean;
  barcode?: string;
  costPerUnit: number;
  pointsValue: number;
}

const ItemForm: React.FC<ItemFormProps> = ({ item, onSuccess, onCancel }) => {
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [units, setUnits] = useState([]);
  const [storageTypes, setStorageTypes] = useState([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl || null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ItemFormData>({
    defaultValues: item ? {
      name: item.name,
      sku: item.sku,
      unitId: item.unitId,
      categoryId: item.categoryId,
      vendorId: item.vendorId || '',
      storageTypeId: item.storageTypeId || '',
      moq: item.moq,
      reorderPoint: item.reorderPoint,
      perishable: item.perishable,
      barcode: item.barcode || '',
      costPerUnit: item.costPerUnit || 0,
      pointsValue: item.pointsValue || 0
    } : {
      name: '',
      sku: '',
      unitId: '',
      categoryId: '',
      vendorId: '',
      storageTypeId: '',
      moq: 0,
      reorderPoint: 0,
      perishable: false,
      barcode: '',
      costPerUnit: 0,
      pointsValue: 0
    }
  });

  // Ensure form is reset when `item` prop changes (so selects keep their values on edit)
  useEffect(() => {
    if (item) {
      // prefer explicit id fields, fall back to nested objects returned in list endpoints
      reset({
        name: item.name || '',
        sku: item.sku || '',
        unitId: item.unitId || item.unit?.id || '',
        categoryId: item.categoryId || item.category?.id || '',
        vendorId: item.vendorId || item.vendor?.id || '',
        storageTypeId: item.storageTypeId || item.storageType?.id || '',
        moq: item.moq ?? 0,
        reorderPoint: item.reorderPoint ?? 0,
        perishable: !!item.perishable,
        barcode: item.barcode || '',
        costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : 0,
        pointsValue: item.pointsValue ?? 0,
      });

      // ensure image preview is in-sync
      setImagePreview(item.imageUrl || null);
    } else {
      // reset to defaults when no item
      reset({
        name: '',
        sku: '',
        unitId: '',
        categoryId: '',
        vendorId: '',
        storageTypeId: '',
        moq: 0,
        reorderPoint: 0,
        perishable: false,
        barcode: '',
        costPerUnit: 0,
        pointsValue: 0,
      });
      setImagePreview(null);
    }
  }, [item, reset]);

  const watchedMOQ = watch('moq');

  useEffect(() => {
    fetchCategories();
    fetchVendors();
    fetchUnits();
    fetchStorageTypes();
  }, []);

  // Auto-sync reorder point with MOQ
  useEffect(() => {
    setValue('reorderPoint', watchedMOQ);
  }, [watchedMOQ, setValue]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/items/categories');
      setCategories(response.data);
  // ensure category value is set when options arrive
  if (item) setValue('categoryId', item.categoryId || item.category?.id || '');
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response.data);
  if (item) setValue('vendorId', item.vendorId || item.vendor?.id || '');
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get('/admin-config/units');
      setUnits(response.data.filter((unit: any) => unit.active));
  if (item) setValue('unitId', item.unitId || item.unit?.id || '');
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const fetchStorageTypes = async () => {
    try {
      const response = await api.get('/admin-config/storage-types');
      setStorageTypes(response.data.filter((type: any) => type.active));
  if (item) setValue('storageTypeId', item.storageTypeId || item.storageType?.id || '');
    } catch (error) {
      console.error('Failed to fetch storage types:', error);
    }
  };

  const formatSKU = (value: string) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Ensure format: 3 letters + 3 digits
    const letters = cleaned.replace(/[0-9]/g, '').slice(0, 3);
    const numbers = cleaned.replace(/[^0-9]/g, '').slice(0, 3);
    
    return letters + numbers;
  };

  const handleSKUChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSKU(e.target.value);
    setValue('sku', formatted);
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: ItemFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        const value = data[key as keyof ItemFormData];
        if (value !== undefined && value !== '') {
          formData.append(key, value.toString());
        }
      });

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (item) {
        await api.put(`/items/${item.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess('Success', 'Item updated successfully');
      } else {
        await api.post('/items', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess('Success', 'Item created successfully');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save item:', error);
      showError('Error', 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Name *
          </label>
          <input
            {...register('name', { required: 'Item name is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter item name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SKU *
          </label>
          <input
            {...register('sku', { 
              required: 'SKU is required',
              pattern: {
                value: /^[A-Z]{3}[0-9]{3}$/,
                message: 'SKU must be 3 letters followed by 3 digits (e.g., VEG001)'
              }
            })}
            onChange={handleSKUChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="VEG001"
            maxLength={6}
          />
          {errors.sku && (
            <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Format: 3 letters + 3 digits (auto-formatted)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit *
          </label>
          <select
            {...register('unitId', { required: 'Unit is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Unit</option>
            {units.map((unit: any) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>
          {errors.unitId && (
            <p className="mt-1 text-sm text-red-600">{errors.unitId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            {...register('categoryId', { required: 'Category is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Category</option>
            {categories.map((category: any) => (
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
            Vendor
          </label>
          <select
            {...register('vendorId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Vendor</option>
            {vendors.map((vendor: any) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Storage Type
          </label>
          <select
            {...register('storageTypeId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Storage Type</option>
            {storageTypes.map((type: any) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            MOQ (Minimum Order Quantity) *
          </label>
          <input
            type="number"
            {...register('moq', { 
              required: 'MOQ is required',
              valueAsNumber: true, 
              min: { value: 1, message: 'MOQ must be at least 1' }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Minimum Order Quantity"
          />
          {errors.moq && (
            <p className="mt-1 text-sm text-red-600">{errors.moq.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reorder Point (Auto-synced with MOQ)
          </label>
          <input
            type="number"
            {...register('reorderPoint', { 
              valueAsNumber: true, 
              min: 0 
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Reorder Point"
            readOnly
          />
          <p className="mt-1 text-xs text-gray-500">Automatically set to MOQ value</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cost per Unit (₹)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('costPerUnit', { 
              valueAsNumber: true, 
              min: { value: 0, message: 'Cost cannot be negative' }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
          />
          {errors.costPerUnit && (
            <p className="mt-1 text-sm text-red-600">{errors.costPerUnit.message}</p>
          )}
        </div>

      

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barcode
          </label>
          <input
            {...register('barcode')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter barcode"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('perishable')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Perishable Item
            </label>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Image
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
          {imagePreview ? (
            <div className="relative">
              <img
                src={SERVERURL+imagePreview}
                alt="Preview"
                className="max-h-32 rounded-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
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
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
        </button>
      </div>
    </form>
  );
};

export default ItemForm;