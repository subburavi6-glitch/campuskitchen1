import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface AutoPOConfig {
  enabled: boolean;
  checkInterval: number; // in minutes
  manual?: boolean; // Manual trigger flag
}

const useAutoPO = (config: AutoPOConfig = { enabled: false, checkInterval: 60, manual: false }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!config.enabled) return; // Remove auto generation completely

    // Only manual generation is now supported
    if (config.manual) {
      generateManualPO();
    }
  }, [config.enabled, config.checkInterval, config.manual]);

  const generateManualPO = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      const response = await api.get('/items');
      const items = response.data;
      
      const lowStockItems = items.filter((item: any) => 
        item.totalStock <= item.reorderPoint && item.preferredVendor
      );

      if (lowStockItems.length === 0) {
        toast.info('No low stock items found');
        return { success: true, items: [] };
      }

      return { success: true, items: lowStockItems };
    } catch (error) {
      console.error('Failed to check low stock items:', error);
      toast.error('Failed to check low stock items');
      return { success: false, items: [] };
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating };
};

// Export manual PO generation function
export const generateManualPO = async () => {
  try {
    const response = await api.get('/items');
    const items = response.data;
    
    const lowStockItems = items.filter((item: any) => 
      item.totalStock <= item.reorderPoint && item.preferredVendor
    );

    if (lowStockItems.length === 0) {
      toast.info('No low stock items found');
      return { success: true, items: [] };
    }

    return { success: true, items: lowStockItems };
  } catch (error) {
    console.error('Failed to check low stock items:', error);
    return { success: false, items: [] };
  }
};

export default useAutoPO;