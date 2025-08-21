import { useState, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface UploadOptions {
  fileType?: 'csv' | 'xlsx';
  delimiter?: ',' | ';';
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY';
  webhookUrl?: string;
}

interface ImportItem {
  importId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
  fileName: string;
  uploadedAt: Date;
  completedAt?: Date;
  stats?: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    remaining: number;
  };
}

interface UseImportManagerReturn {
  imports: ImportItem[];
  currentImport: ImportItem | null;
  isUploading: boolean;
  uploadFile: (file: File, options?: UploadOptions) => Promise<void>;
  selectImport: (importId: string) => void;
  clearCurrentImport: () => void;
  refreshImport: (importId: string) => Promise<void>;
  getImportById: (importId: string) => ImportItem | undefined;
}

export const useImportManager = (): UseImportManagerReturn => {
  const [imports, setImports] = useState<ImportItem[]>([]);
  const [currentImport, setCurrentImport] = useState<ImportItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadAbortController = useRef<AbortController | null>(null);

  const uploadFile = useCallback(async (file: File, options?: UploadOptions) => {
    if (isUploading) {
      toast.error('Já existe um upload em andamento');
      return;
    }

    setIsUploading(true);
    
    try {
      // Criar controller para cancelar upload se necessário
      uploadAbortController.current = new AbortController();
      
      const response = await apiService.uploadImport(file, options);
      
      const newImport: ImportItem = {
        importId: response.importId,
        status: response.status,
        fileName: file.name,
        uploadedAt: new Date(),
        stats: {
          total: 0,
          processed: 0,
          succeeded: 0,
          failed: 0,
          remaining: 0,
        },
      };

      setImports(prev => [newImport, ...prev].slice(0, 20)); // Manter apenas as 20 mais recentes
      setCurrentImport(newImport);
      
      toast.success('Arquivo enviado com sucesso!');
      
      // Iniciar monitoramento automático
      startMonitoring(newImport.importId);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Upload cancelado');
      } else {
        const errorMessage = error.response?.data?.error?.message || 'Erro ao enviar arquivo';
        toast.error(errorMessage);
        console.error('Upload error:', error);
      }
    } finally {
      setIsUploading(false);
      uploadAbortController.current = null;
    }
  }, [isUploading]);

  const startMonitoring = useCallback((importId: string) => {
    // Monitorar status a cada 5 segundos até completar
    const interval = setInterval(async () => {
      try {
        const status = await apiService.getImportStatus(importId);
        
        setImports(prev => prev.map(imp => 
          imp.importId === importId 
            ? { 
                ...imp, 
                status: status.status,
                stats: status.stats,
                completedAt: status.finishedAt ? new Date(status.finishedAt) : undefined,
              }
            : imp
        ));

        // Atualizar import atual se for o selecionado
        setCurrentImport(prev => 
          prev?.importId === importId 
            ? { 
                ...prev, 
                status: status.status,
                stats: status.stats,
                completedAt: status.finishedAt ? new Date(status.finishedAt) : undefined,
              }
            : prev
        );

        // Parar monitoramento se completou
        if (['completed', 'failed', 'canceled'].includes(status.status)) {
          clearInterval(interval);
          
          if (status.status === 'completed') {
            toast.success('Processamento concluído com sucesso!');
          } else if (status.status === 'failed') {
            toast.error('Processamento falhou. Verifique os erros.');
          }
        }
      } catch (error) {
        console.error('Error monitoring import:', error);
        // Parar monitoramento em caso de erro
        clearInterval(interval);
      }
    }, 5000);

    // Limpar intervalo após 10 minutos (timeout de segurança)
    setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
  }, []);

  const selectImport = useCallback((importId: string) => {
    const importItem = imports.find(imp => imp.importId === importId);
    if (importItem) {
      setCurrentImport(importItem);
    }
  }, [imports]);

  const clearCurrentImport = useCallback(() => {
    setCurrentImport(null);
  }, []);

  const refreshImport = useCallback(async (importId: string) => {
    try {
      const status = await apiService.getImportStatus(importId);
      
      setImports(prev => prev.map(imp => 
        imp.importId === importId 
          ? { 
              ...imp, 
              status: status.status,
              stats: status.stats,
              completedAt: status.finishedAt ? new Date(status.finishedAt) : undefined,
            }
          : imp
      ));

      // Atualizar import atual se for o selecionado
      setCurrentImport(prev => 
        prev?.importId === importId 
          ? { 
              ...prev, 
              status: status.status,
              stats: status.stats,
              completedAt: status.finishedAt ? new Date(status.finishedAt) : undefined,
            }
          : prev
      );
      
    } catch (error) {
      console.error('Error refreshing import:', error);
      toast.error('Erro ao atualizar status da importação');
    }
  }, []);

  const getImportById = useCallback((importId: string) => {
    return imports.find(imp => imp.importId === importId);
  }, [imports]);

  return {
    imports,
    currentImport,
    isUploading,
    uploadFile,
    selectImport,
    clearCurrentImport,
    refreshImport,
    getImportById,
  };
};
