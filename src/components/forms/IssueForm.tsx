import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface IssueFormProps {
  issue?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface IssueFormData {
  indentId: string;
  items: Array<{
    itemId: string;
    batchId: string;
    qty: number;
  }>;
}

const IssueForm: React.FC<IssueFormProps> = ({ issue, onSuccess, onCancel }) => {
  const [approvedIndents, setApprovedIndents] = useState([]);
  const [selectedIndent, setSelectedIndent] = useState<any>(null);
  const [availableBatches, setAvailableBatches] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<IssueFormData>({
    defaultValues: issue ? {
      indentId: issue.indentId,
      items: issue.items.map((item: any) => ({
        itemId: item.itemId,
        batchId: item.batchId,
        qty: item.qty
      }))
    } : {
      indentId: '',
      items: []
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedIndentId = watch('indentId');

  useEffect(() => {
    fetchApprovedIndents();
  }, []);

  useEffect(() => {
    if (watchedIndentId && !issue) {
      fetchIndentDetails(watchedIndentId);
    }
  }, [watchedIndentId]);

  const fetchApprovedIndents = async () => {
    try {
      const response = await api.get('/indents', { 
        params: { status: 'APPROVED' } 
      });
      setApprovedIndents(response.data);
    } catch (error) {
      console.error('Failed to fetch approved indents:', error);
    }
  };

  const fetchIndentDetails = async (indentId: string) => {
    try {
      const response = await api.get(`/indents/${indentId}`);
      const indent = response.data;
      setSelectedIndent(indent);
      
      // Fetch available batches for each item
      const batchPromises = indent.items.map(async (item: any) => {
        const batchResponse = await api.get(`/items/${item.itemId}/batches`);
        return { itemId: item.itemId, batches: batchResponse.data };
      });
      
      const batchResults = await Promise.all(batchPromises);
      const batchMap = batchResults.reduce((acc, result) => {
        acc[result.itemId] = result.batches;
        return acc;
      }, {});
      
      setAvailableBatches(batchMap);
      
      // Populate items from indent
      const issueItems = indent.items
        .filter((item: any) => item.approvedQty > item.issuedQty)
        .map((item: any) => ({
          itemId: item.itemId,
          batchId: '',
          qty: item.approvedQty - item.issuedQty
        }));
      
      replace(issueItems);
    } catch (error) {
      console.error('Failed to fetch indent details:', error);
    }
  };

  const onSubmit = async (data: IssueFormData) => {
    setLoading(true);
    try {
      if (issue) {
        await api.put(`/issues/${issue.id}`, data);
        toast.success('Issue updated successfully');
      } else {
        await api.post('/issues', data);
        toast.success('Issue created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save issue:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Approved Indent *
        </label>
        <select
          {...register('indentId', { required: 'Indent is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!!issue}
        >
          <option value="">Select Approved Indent</option>
          {approvedIndents.map((indent: any) => (
            <option key={indent.id} value={indent.id}>
              {indent.meal} - {new Date(indent.requestedForDate).toLocaleDateString()} - {indent.requester.name}
            </option>
          ))}
        </select>
        {errors.indentId && (
          <p className="mt-1 text-sm text-red-600">{errors.indentId.message}</p>
        )}
      </div>

      {/* Items Section */}
      {selectedIndent && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Issue</h3>
          <div className="space-y-4">
            {fields.map((field, index) => {
              const indentItem = selectedIndent.items.find((item: any) => item.itemId === field.itemId);
              const batches = availableBatches[field.itemId] || [];
              
              return (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item
                    </label>
                    <p className="text-sm font-medium text-gray-900 py-2">
                      {indentItem?.item.name} ({typeof indentItem?.item.unit === 'object' ? (indentItem?.item.unit.symbol ?? indentItem?.item.unit.name ?? '') : indentItem?.item.unit})
                    </p>
                    <p className="text-xs text-gray-500">
                      Approved: {indentItem?.approvedQty}, Issued: {indentItem?.issuedQty}
                    </p>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch *
                    </label>
                    <select
                      {...register(`items.${index}.batchId`, { required: 'Batch is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Batch</option>
                      {batches.map((batch: any) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchNo} (Available: {batch.qtyOnHand})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Qty *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.qty`, { 
                        required: 'Quantity is required',
                        valueAsNumber: true,
                        min: 0.01,
                        max: indentItem?.approvedQty - indentItem?.issuedQty
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remaining
                    </label>
                    <p className="text-sm text-gray-600 py-2">
                      {(indentItem?.approvedQty - indentItem?.issuedQty - (watch(`items.${index}.qty`) || 0)).toFixed(2)}
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
              );
            })}
          </div>
        </div>
      )}

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
          disabled={loading || fields.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : issue ? 'Update Issue' : 'Create Issue'}
        </button>
      </div>
    </form>
  );
};

export default IssueForm;