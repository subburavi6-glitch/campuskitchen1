import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import Select from 'react-select';
import api from '../../utils/api';
import { showSuccess, showError } from '../../utils/sweetAlert';

interface IndentFormProps {
  indent?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface IndentFormData {
  requestedForDate: string;
  meal: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  notes?: string;
  items: Array<{
    itemId: string;
    requestedQty: string;
  }>;
}

const IndentForm: React.FC<IndentFormProps> = ({ indent, onSuccess, onCancel }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Transform items for react-select - FIXED: Proper label structure
  const itemOptions = items.map((item: any) => ({
    value: item.id,
    label: `${item.name} (${item.unit?.symbol || item.unit?.name || 'Unit'}) - Stock: ${item.totalStock || 0}`,
    item: item
  }));

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<IndentFormData>({
    defaultValues: {
      requestedForDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meal: 'LUNCH',
      notes: '',
      items: [{ itemId: '', requestedQty: '0' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  // FIXED: Reset form with indent data after items are loaded
  useEffect(() => {
    if (dataLoaded && indent) {
      reset({
        requestedForDate: new Date(indent.requestedForDate).toISOString().split('T')[0],
        meal: indent.meal,
        notes: indent.notes || '',
        items: indent.items?.length > 0 
          ? indent.items.map((item: any) => ({
              itemId: item.itemId || '',
              requestedQty: item.requestedQty || '0'
            }))
          : [{ itemId: '', requestedQty: '0' }]
      });
    }
  }, [dataLoaded, indent, reset]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data || []);
      setDataLoaded(true);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setDataLoaded(true);
    }
  };

  const onSubmit = async (data: IndentFormData) => {
    setLoading(true);
    try {
      if (indent) {
        await api.put(`/indents/${indent.id}`, data);
        showSuccess('Success', 'Indent updated successfully');
      } else {
        await api.post('/indents', data);
        showSuccess('Success', 'Indent created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save indent:', error);
      showError('Error', 'Failed to save indent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested For Date *
          </label>
          <input
            type="date"
            {...register('requestedForDate', { required: 'Date is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.requestedForDate && (
            <p className="mt-1 text-sm text-red-600">{errors.requestedForDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meal *
          </label>
          <select
            {...register('meal', { required: 'Meal is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="SNACKS">Snacks</option>
            <option value="DINNER">Dinner</option>
          </select>
          {errors.meal && (
            <p className="mt-1 text-sm text-red-600">{errors.meal.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter any notes or special requirements"
            style={{ height: '76px' }}
          />
        </div>
      </div>

      {/* Items Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Items Required</h3>
          <button
            type="button"
            onClick={() => append({ itemId: '', requestedQty: '0' })}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm"
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-lg">
              <div className="col-span-8">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item *
                </label>
                {/* FIXED: Using Controller properly */}
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
                      value={itemOptions.find(option => option.value === itemField.value) || null}
                      onChange={(option) => itemField.onChange(option?.value || '')}
                      isDisabled={!dataLoaded}
                    />
                  )}
                />
                {errors.items?.[index]?.itemId && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.itemId?.message}</p>
                )}
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Quantity *
                </label>
                <input
                  type="text"
                  {...register(`items.${index}.requestedQty`, { 
                    required: 'Quantity is required'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity"
                />
                {errors.items?.[index]?.requestedQty && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.requestedQty?.message}</p>
                )}
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
          disabled={loading || !dataLoaded}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : indent ? 'Update Indent' : 'Create Indent'}
        </button>
      </div>
    </form>
  );
};

export default IndentForm;
