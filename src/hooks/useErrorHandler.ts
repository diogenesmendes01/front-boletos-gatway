import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import type { ApiError, ErrorCode } from '../types/import.types';

const errorMessages: Record<ErrorCode, string> = {
  INVALID_FILE_TYPE: 'Tipo de arquivo inválido. Use apenas CSV ou XLSX.',
  MISSING_COLUMNS: 'Colunas obrigatórias ausentes no arquivo.',
  TOO_MANY_ROWS: 'O arquivo excede o limite de 2.000 linhas.',
  UNAUTHORIZED: 'Não autorizado. Faça login novamente.',
  PAYLOAD_TOO_LARGE: 'Arquivo muito grande. Tamanho máximo: 10MB.',
  UNSUPPORTED_MEDIA_TYPE: 'Tipo de conteúdo não suportado.',
  ROW_VALIDATION_FAILED: 'Erro de validação em uma ou mais linhas.',
  RATE_LIMITED: 'Muitas requisições. Tente novamente mais tarde.',
  INTERNAL_ERROR: 'Erro interno do servidor. Tente novamente.',
};

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown) => {
    console.error('Error caught:', error);

    if (error instanceof AxiosError) {
      const apiError = error.response?.data as ApiError;
      
      if (apiError?.error?.code) {
        const message = errorMessages[apiError.error.code as ErrorCode] || 
                       apiError.error.message || 
                       'Erro desconhecido';
        
        if (apiError.error.code === 'MISSING_COLUMNS' && apiError.error.message) {
          toast.error(apiError.error.message);
        } else {
          toast.error(message);
        }
        
        return message;
      }

      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return 'Não autorizado';
      }

      if (error.response?.status === 429) {
        toast.error('Muitas requisições. Aguarde um momento.');
        return 'Rate limit excedido';
      }

      if (error.response?.status === 500) {
        toast.error('Erro no servidor. Tente novamente mais tarde.');
        return 'Erro interno do servidor';
      }

      if (error.code === 'ECONNABORTED') {
        toast.error('Tempo de requisição excedido. Tente novamente.');
        return 'Timeout';
      }

      if (error.code === 'ERR_NETWORK') {
        toast.error('Erro de conexão. Verifique sua internet.');
        return 'Erro de rede';
      }
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    toast.error(message);
    return message;
  }, []);

  return { handleError };
};