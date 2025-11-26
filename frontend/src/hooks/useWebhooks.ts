import { useState, useEffect, useCallback } from 'react';
import { webhookAPI } from '../api/endpoints';
import type { Webhook } from '@/types';
import toast from 'react-hot-toast';

export const useWebhooks = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await webhookAPI.getAll();
      setWebhooks(data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const deleteWebhook = async (id: number) => {
    try {
      await webhookAPI.delete(id);
      toast.success('Webhook deleted successfully');
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete webhook');
    }
  };

  const testWebhook = async (id: number) => {
    try {
      const result = await webhookAPI.test(id);
      if (result.success) {
        toast.success('Webhook test successful');
      } else {
        toast.error(result.message || 'Webhook test failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to test webhook');
    }
  };

  return {
    webhooks,
    loading,
    fetchWebhooks,
    deleteWebhook,
    testWebhook,
  };
};
