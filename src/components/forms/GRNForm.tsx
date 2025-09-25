import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface GRNFormProps {
  grn?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface GRNFormData {
  poId: string;
  invoiceNo?: string;
  notes?: string;
  items: Array<{
    poItemId: string;
    itemId: string;
    batchNo: string;
    mfgDate?: string;
    expDate?: string;
    receivedQty: number;
    unitCost: number;
  }>;
}

const GRNForm: React.FC<GRNFormProps> = ({ grn, onSuccess, onCancel }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<GRNFormData>({
    defaultValues: grn ? {
      poId: grn.poId,
      invoiceNo: grn.invoiceNo || '',
      notes: grn.notes || '',
      items: grn.items.map((item: any) => ({
        poItemId: item.poItemId,
        itemId: item.itemId,
        batchNo: item.batchNo,
        mfgDate: item.mfgDate ? new Date(item.mfgDate).toISOString().split('T')[0] : '',
        expDate: item.expDate ? new Date(item.expDate).toISOString().split('T')[0] : '',
        receivedQty: item.receivedQty,
        unitCost: item.unitCost
      }))
    } : {
      poId: '',
      invoiceNo: '',
      notes: '',
      items: []
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedPOId = watch('poId');

  useEffect(() => {
    fetchOpenPurchaseOrders();
  }, []);

  useEffect(() => {
    if (watchedPOId && !grn) {
      fetchPODetails(watchedPOId);
    }
  }, [watchedPOId]);

  const fetchOpenPurchaseOrders = async () => {
    try {
      const response = await api.get('/purchase-orders', { 
        params: { status: 'OPEN,PARTIAL' } 
      });
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    }
  };

  const fetchPODetails = async (poId: string) => {
    try {
      const response = await api.get(`/purchase-orders/${poId}`);
      const po = response.data;
      setSelectedPO(po);
      
      // Populate items from PO
      const poItems = po.items.map((item: any) => ({
        poItemId: item.id,
        itemId: item.itemId,
        batchNo: '',
        mfgDate: '',
        expDate: '',
        receivedQty: item.orderedQty - item.receivedQty,
        unitCost: item.unitCost
      }));
      
      replace(poItems);
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
    }
  };

  const onSubmit = async (data: GRNFormData) => {
    setLoading(true);
    try {
      if (grn) {
        await api.put(`/grn/${grn.id}`, data);
        toast.success('GRN updated successfully');
      } else {
        await api.post('/grn', data);
        toast.success('GRN created successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Order *
          </label>
          <select
            {...register('poId', { required: 'Purchase Order is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!!grn}
          >
            <option value="">Select Purchase Order</option>
            {purchaseOrders.map((po: any) => (
              <option key={po.id} value={po.id}>
                {po.poNo} - {po.vendor.name}
              </option>
            ))}
          </select>
          {errors.poId && (
            <p className="mt-1 text-sm text-red-600">{errors.poId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Number
          </label>
          <input
            {...register('invoiceNo')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter invoice number"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter any notes"
          />
        </div>
      </div>

      {/* Items Section */}
      {selectedPO && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Receive</h3>
          <div className="space-y-4">
            {fields.map((field, index) => {
              const poItem = selectedPO.items.find((item: any) => item.id === field.poItemId);
              return (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-lg">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item
                    </label>
                    <p className="text-sm font-medium text-gray-900 py-2">
                      {poItem?.item.name} ({typeof poItem?.item.unit === 'object' ? (poItem?.item.unit.symbol ?? poItem?.item.unit.name ?? '') : poItem?.item.unit})
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch No *
                    </label>
                    <input
                      {...register(`items.${index}.batchNo`, { required: 'Batch number is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Batch"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Qty *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.receivedQty`, { 
                        required: 'Received quantity is required',
                        valueAsNumber: true,
                        min: 0.01
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      readOnly
                      {...register(`items.${index}.unitCost`, { 
                        valueAsNumber: true,
                        min: 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      title="Price is fixed from Purchase Order"
                    />
                    <p className="text-xs text-gray-500 mt-1">Fixed from PO</p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mfg Date
                    </label>
                    <input
                      type="date"
                      {...register(`items.${index}.mfgDate`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exp Date
                    </label>
                    <input
                      type="date"
                      {...register(`items.${index}.expDate`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
          {loading ? 'Saving...' : grn ? 'Update GRN' : 'Create GRN'}
        </button>
      </div>
    </form>
  );
};

export default GRNForm;