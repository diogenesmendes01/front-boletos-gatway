import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { ImportResponse, ImportStatusResponse } from '../types/import.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.seudominio.com';
const IS_MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || import.meta.env.DEV;

class ApiService {
  private client: AxiosInstance;
  private mockData: { [key: string]: any } = {};

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async uploadImport(
    file: File,
    options?: {
      fileType?: 'csv' | 'xlsx';
      delimiter?: ',' | ';';
      dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY';
      webhookUrl?: string;
    }
  ): Promise<ImportResponse> {
    if (IS_MOCK_MODE) {
      return this.mockUploadImport(file, options);
    }

    const formData = new FormData();
    formData.append('file', file);

    if (options?.fileType) {
      formData.append('fileType', options.fileType);
    } else {
      const fileType = file.name.endsWith('.xlsx') ? 'xlsx' : 'csv';
      formData.append('fileType', fileType);
    }

    if (options?.delimiter) {
      formData.append('delimiter', options.delimiter);
    }

    if (options?.dateFormat) {
      formData.append('dateFormat', options.dateFormat);
    } else {
      formData.append('dateFormat', 'YYYY-MM-DD');
    }

    if (options?.webhookUrl) {
      formData.append('webhookUrl', options.webhookUrl);
    }

    const idempotencyKey = crypto.randomUUID();

    const response = await this.client.post<ImportResponse>('/v1/imports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': idempotencyKey,
      },
    });

    return response.data;
  }

  async getImportStatus(importId: string): Promise<ImportStatusResponse> {
    if (IS_MOCK_MODE) {
      return this.mockGetImportStatus(importId);
    }

    const response = await this.client.get<ImportStatusResponse>(`/v1/imports/${importId}`);
    return response.data;
  }

  async downloadResults(importId: string): Promise<Blob> {
    if (IS_MOCK_MODE) {
      return this.mockDownloadResults(importId);
    }

    const response = await this.client.get(`/v1/imports/${importId}/results.csv`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async downloadErrors(importId: string): Promise<Blob> {
    if (IS_MOCK_MODE) {
      return this.mockDownloadErrors(importId);
    }

    const response = await this.client.get(`/v1/imports/${importId}/errors.csv`, {
      responseType: 'blob',
    });
    return response.data;
  }

  subscribeToProgress(
    importId: string,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void
  ): () => void {
    if (IS_MOCK_MODE) {
      return this.mockSubscribeToProgress(importId, onMessage, onError);
    }

    // Token is included in Authorization header via interceptor
    const eventSource = new EventSource(
      `${API_BASE_URL}/v1/imports/${importId}/events`,
      {
        withCredentials: false,
      }
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      if (onError) onError(error);
      eventSource.close();
    };

    return () => eventSource.close();
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  clearToken(): void {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Mock methods for development
  private async mockUploadImport(
    _file: File,
    _options?: any
  ): Promise<ImportResponse> {
    await this.delay(1000);
    
    const importId = crypto.randomUUID();
    this.mockData[importId] = {
      status: 'queued',
      stats: {
        total: 100,
        processed: 0,
        succeeded: 0,
        failed: 0,
        remaining: 100,
      },
      startedAt: new Date().toISOString(),
      finishedAt: null,
      etaSeconds: 30,
    };

    // Simulate processing
    setTimeout(() => this.simulateProgress(importId), 2000);

    return {
      importId,
      status: 'queued' as const,
      receivedAt: new Date().toISOString(),
      maxRows: 2000,
    };
  }

  private async mockGetImportStatus(importId: string): Promise<ImportStatusResponse> {
    await this.delay(300);
    
    const data = this.mockData[importId];
    if (!data) {
      throw new Error('Importação não encontrada');
    }

    return data;
  }

  private async mockDownloadResults(_importId: string): Promise<Blob> {
    await this.delay(500);
    
    const csvContent = `email,name,document,amount,status
joao@exemplo.com,João Silva,12345678901,100.50,success
maria@exemplo.com,Maria Santos,98765432109,250.00,success
pedro@exemplo.com,Pedro Oliveira,45612378945,75.25,success`;
    
    return new Blob([csvContent], { type: 'text/csv' });
  }

  private async mockDownloadErrors(_importId: string): Promise<Blob> {
    await this.delay(500);
    
    const csvContent = `email,name,document,amount,error
invalid@email,Ana Costa,invalid_document,invalid_amount,Documento inválido
incomplete@data.com,,12345678901,50.00,Nome obrigatório`;
    
    return new Blob([csvContent], { type: 'text/csv' });
  }

  private mockSubscribeToProgress(
    importId: string,
    onMessage: (data: any) => void,
    _onError?: (error: Event) => void
  ): () => void {
    let interval: number;
    
    const sendProgress = () => {
      const data = this.mockData[importId];
      if (data && data.status === 'processing') {
        onMessage({
          processed: data.stats.processed,
          succeeded: data.stats.succeeded,
          failed: data.stats.failed,
          remaining: data.stats.remaining,
          etaSeconds: data.etaSeconds,
        });
      }
    };

    interval = window.setInterval(sendProgress, 1000);
    
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }

  private simulateProgress(importId: string) {
    const data = this.mockData[importId];
    if (!data) return;

    data.status = 'processing';
    
    const interval = window.setInterval(() => {
      if (data.stats.processed < data.stats.total) {
        const increment = Math.min(5, data.stats.total - data.stats.processed);
        data.stats.processed += increment;
        
        // 90% success rate simulation
        const successes = Math.floor(increment * 0.9);
        const failures = increment - successes;
        
        data.stats.succeeded += successes;
        data.stats.failed += failures;
        data.stats.remaining = data.stats.total - data.stats.processed;
        
        // Update ETA
        const remainingTime = Math.ceil(data.stats.remaining / 5);
        data.etaSeconds = remainingTime;
      } else {
        // Processing completed
        data.status = 'completed';
        data.finishedAt = new Date().toISOString();
        data.etaSeconds = 0;
        window.clearInterval(interval);
      }
    }, 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock validation method for login
  isValidMockCredentials(email: string, token: string): boolean {
    const validCredentials = [
      { email: 'demo@olympiabank.com', token: 'demo-token-123' },
      { email: 'teste@olympiabank.com', token: 'teste-token-456' },
      { email: 'admin@olympiabank.com', token: 'admin-token-789' },
    ];

    return validCredentials.some(
      cred => cred.email === email && cred.token === token
    );
  }
}

export const apiService = new ApiService();