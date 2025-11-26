export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  sku: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ProductListResponse {
  total: number;
  page: number;
  page_size: number;
  products: Product[];
}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  event_type: string;
  is_enabled: boolean;
  secret_key?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreate {
  name: string;
  url: string;
  event_type: string;
  is_enabled: boolean;
  secret_key?: string;
}

export interface UploadProgress {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage?: 'parsing' | 'validating' | 'importing' | 'finalizing' | 'complete' | 'error';
  progress: number;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  error_message?: string;
  message?: string;
}

export interface UploadResponse {
  task_id: string;
  message: string;
}

export interface UploadTask {
  task_id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  duplicate_rows: number; 
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface TaskListResponse {
  total: number;
  page: number;
  page_size: number;
  tasks: UploadTask[];
}
