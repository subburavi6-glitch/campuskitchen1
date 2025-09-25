import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import Select from 'react-select';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface PurchaseOrderFormProps {
  purchaseOrder?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface POFormData {
  vendorId: string;
  notes?: string;
  items: Array<{
    itemId: string;
    orderedQty: number;
    unitCost: number;
    taxRate: number;
  }>;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ purchaseOrder, onSuccess, onCancel }) => {
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Transform options for react-select - FIXED: Proper label property
  const vendorOptions = vendors.map((vendor: any) => ({
    value: vendor.id,
    label: vendor.name  // This was missing proper label
  }));

  const itemOptions = items.map((item: any) => ({
    value: item.id,
    label: `${item.name} (${item.unit?.symbol || item.unit?.name || 'Unit'})`,  // FIXED: Proper string interpolation for label
    item: item
  }));

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<POFormData>({
    defaultValues: purchaseOrder ? {
      vendorId: purchaseOrder.vendorId,
      notes: purchaseOrder.notes || '',
      items: purchaseOrder.items.map((item: any) => ({
        itemId: item.itemId,
        orderedQty: item.orderedQty,
        unitCost: item.unitCost,
        taxRate: item.taxRate
      }))
    } : {
      vendorId: '',
      notes: '',
      items: [{ itemId: '', orderedQty: 0, unitCost: 0, taxRate: 18 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');

  useEffect(() => {
    fetchVendors();
    fetchItems();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response.data);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const calculateSubtotal = () => {
    return watchedItems.reduce((sum, item) => {
      return sum + (item.orderedQty * item.unitCost);
    }, 0);
  };

  const calculateTax = () => {
    return watchedItems.reduce((sum, item) => {
      const itemTotal = item.orderedQty * item.unitCost;
      return sum + (itemTotal * (item.taxRate / 100));
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const onSubmit = async (data: POFormData) => {
    setLoading(true);
    try {
      if (purchaseOrder) {
        await api.put(`/purchase-orders/${purchaseOrder.id}`, data);
        toast.success('Purchase order updated successfully');
      } else {
        await api.post('/purchase-orders', data);
        toast.success('Purchase order created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save purchase order:', error);
      toast.error('Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vendor *
          </label>
          <Controller
            name="vendorId"
            control={control}
            rules={{ required: 'Vendor is required' }}
            render={({ field }) => (
              <Select
                {...field}
                options={vendorOptions}
                isSearchable
                placeholder="Search and select vendor..."
                className="react-select-container"
                classNamePrefix="react-select"
                value={vendorOptions.find(option => option.value === field.value) || null}  // FIXED: Added || null
                onChange={(option) => field.onChange(option?.value || '')}
              />
            )}
          />
          {errors.vendorId && (
            <p className="mt-1 text-sm text-red-600">{errors.vendorId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter any notes"
             
          />
        </div>
      </div>

      {/* Items Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Items</h3>
          <button
            type="button"
            onClick={() => append({ itemId: '', orderedQty: 0, unitCost: 0, taxRate: 18 })}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm"
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-lg">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item *
                </label>
                <Controller
                  name={`items.${index}.itemId`}
                  control={control}
                  rules={{ required: 'Item is required' }}
                  render={({ field: itemField }) => (
                    <Select
                      {...itemField}
                      options={itemOptions}
                      isSearchable
                      placeholder="Search and select item..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={itemOptions.find(option => option.value === itemField.value) || null}  // FIXED: Added || null
                      onChange={(option) => itemField.onChange(option?.value || '')}
                    />
                  )}
                />
                {errors.items?.[index]?.itemId && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.itemId?.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.orderedQty`, { 
                    required: 'Quantity is required',
                    valueAsNumber: true,
                    min: { value: 0.01, message: 'Quantity must be greater than 0' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.items?.[index]?.orderedQty && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.orderedQty?.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.unitCost`, { 
                    required: 'Unit cost is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Unit cost cannot be negative' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.items?.[index]?.unitCost && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.unitCost?.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax %
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.taxRate`, { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Tax rate cannot be negative' },
                    max: { value: 100, message: 'Tax rate cannot exceed 100%' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.items?.[index]?.taxRate && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.taxRate?.message}</p>
                )}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </label>
                <p className="text-sm font-medium text-gray-900 py-2">
                  ₹{((watchedItems[index]?.orderedQty || 0) * (watchedItems[index]?.unitCost || 0)).toFixed(2)}
                </p>
              </div>

              <div className="col-span-1">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-medium">₹{calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Tax:</span>
            <span className="text-sm font-medium">₹{calculateTax().toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Total:</span>
            <span className="font-bold text-lg">₹{calculateTotal().toFixed(2)}</span>
          </div>
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
          {loading ? 'Saving...' : purchaseOrder ? 'Update PO' : 'Create PO'}
        </button>
      </div>
    </form>
  );
};

export default PurchaseOrderForm;
