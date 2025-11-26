import type { TaskListResponse, UploadTask } from '../types';
import axiosInstance from './axios';
import type {
  Product,
  ProductCreate,
  ProductUpdate,
  ProductListResponse,
  Webhook,
  WebhookCreate,
  UploadResponse,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://product-importer-web-production-665f.up.railway.app';

// Product APIs
export const productAPI = {
  getAll: async (params: {
    page?: number;
    page_size?: number;
    sku?: string;
    name?: string;
    is_active?: boolean;
  }) => {
    const response = await axiosInstance.get<ProductListResponse>('/api/products/', {
      params,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await axiosInstance.get<Product>(`/api/products/${id}`);
    return response.data;
  },

  create: async (data: ProductCreate) => {
    const response = await axiosInstance.post<Product>('/api/products/', data);
    return response.data;
  },

  update: async (id: number, data: ProductUpdate) => {
    const response = await axiosInstance.put<Product>(`/api/products/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await axiosInstance.delete(`/api/products/${id}`);
  },

  deleteAll: async () => {
    const response = await axiosInstance.delete('/api/products/');
    return response.data;
  },
};

// Upload APIs
export const uploadAPI = {
  uploadCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<UploadResponse>('/api/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 180000,
    });
    return response.data;
  },

  getProgressURL: (taskId: string) => {
    return `${API_BASE_URL}/api/upload/progress/${taskId}`;
  },

  getAllTasks: async (page: number = 1, pageSize: number = 10, status?: string) => {
    const response = await axiosInstance.get<TaskListResponse>('/api/upload/tasks', {
      params: { page, page_size: pageSize, status }
    });
    return response.data;
  },

  getTaskById: async (taskId: string) => {
    const response = await axiosInstance.get<UploadTask>(`/api/upload/tasks/${taskId}`);
    return response.data;
  },

  deleteTask: async (taskId: string) => {
    const response = await axiosInstance.delete(`/api/upload/tasks/${taskId}`);
    return response.data;
  },
};

// Webhook APIs
export const webhookAPI = {
  getAll: async () => {
    const response = await axiosInstance.get<Webhook[]>('/api/webhooks/');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await axiosInstance.get<Webhook>(`/api/webhooks/${id}`);
    return response.data;
  },

  create: async (data: WebhookCreate) => {
    const response = await axiosInstance.post<Webhook>('/api/webhooks/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<WebhookCreate>) => {
    const response = await axiosInstance.put<Webhook>(`/api/webhooks/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await axiosInstance.delete(`/api/webhooks/${id}`);
  },

  test: async (id: number) => {
    const response = await axiosInstance.post(`/api/webhooks/${id}/test`);
    return response.data;
  },
};

export const dbAPI = {
  getUsage: async () => {
    const response = await axiosInstance.get<{ database_size_bytes: number }>('/api/db-usage');
    return response.data;
  }
};