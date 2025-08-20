import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Paper,
  Button,
  Alert,
  Chip,
  Stack,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  AccessTime,
  Download,
  Error as ErrorIcon,
} from '@mui/icons-material';
import type { ImportStatusResponse, ImportStatus as ImportStatusType } from '../types/import.types';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface ImportStatusProps {
  importId: string;
  onComplete?: () => void;
  useSSE?: boolean;
}

export const ImportStatus: React.FC<ImportStatusProps> = ({ 
  importId, 
  onComplete,
  useSSE = true 
}) => {
  const [status, setStatus] = useState<ImportStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiService.getImportStatus(importId);
      setStatus(data);
      setError(null);

      if (data.status === 'completed' || data.status === 'failed' || data.status === 'canceled') {
        setIsPolling(false);
        if (onComplete) onComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao buscar status');
      console.error('Error fetching status:', err);
    }
  }, [importId, onComplete]);

  useEffect(() => {
    fetchStatus();

    if (useSSE) {
      const unsubscribe = apiService.subscribeToProgress(
        importId,
        (data) => {
          setStatus((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              stats: {
                ...prev.stats,
                processed: data.processed,
                succeeded: data.succeeded,
                failed: data.failed,
                remaining: data.remaining,
              },
              etaSeconds: data.etaSeconds,
            };
          });

          if (data.status) {
            setStatus((prev) => {
              if (!prev) return prev;
              return { ...prev, status: data.status };
            });

            if (data.status === 'completed' || data.status === 'failed') {
              setIsPolling(false);
              fetchStatus();
              if (onComplete) onComplete();
            }
          }
        },
        (error) => {
          console.error('SSE error, falling back to polling:', error);
          setIsPolling(true);
        }
      );

      return () => unsubscribe();
    } else {
      const interval = setInterval(() => {
        if (isPolling) {
          fetchStatus();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [importId, fetchStatus, isPolling, useSSE, onComplete]);

  const downloadFile = async (type: 'results' | 'errors') => {
    try {
      const blob = type === 'results' 
        ? await apiService.downloadResults(importId)
        : await apiService.downloadErrors(importId);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${importId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Arquivo de ${type === 'results' ? 'resultados' : 'erros'} baixado`);
    } catch (err) {
      toast.error(`Erro ao baixar arquivo de ${type === 'results' ? 'resultados' : 'erros'}`);
      console.error(`Error downloading ${type}:`, err);
    }
  };

  const getStatusIcon = (status: ImportStatusType) => {
    const iconProps = { sx: { fontSize: 28 } };
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" {...iconProps} />;
      case 'failed':
      case 'canceled':
        return <Cancel color="error" {...iconProps} />;
      case 'processing':
        return <CircularProgress size={28} color="primary" />;
      default:
        return <AccessTime color="action" {...iconProps} />;
    }
  };

  const getStatusLabel = (status: ImportStatusType) => {
    const labels = {
      queued: 'Na fila',
      processing: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou',
      canceled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: ImportStatusType) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'canceled':
        return 'error';
      case 'processing':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const calculateProgress = (): number => {
    if (!status?.stats) return 0;
    const { total, processed } = status.stats;
    if (total === 0) return 0;
    return Math.round((processed / total) * 100);
  };

  if (error) {
    return (
      <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          <Typography variant="h6" component="div" gutterBottom>
            Erro ao carregar status
          </Typography>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!status) {
    return (
      <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
        <Card elevation={3}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress size={32} sx={{ mr: 2 }} />
              <Typography variant="h6">Carregando informações...</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const progress = calculateProgress();

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h4" component="h1">
                Status da Importação
              </Typography>
              <Chip
                icon={getStatusIcon(status.status)}
                label={getStatusLabel(status.status)}
                color={getStatusColor(status.status) as any}
                sx={{ px: 2, py: 1 }}
              />
            </Stack>
            
            <Typography variant="body2" color="text.secondary">
              ID: {importId}
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">Progresso</Typography>
              <Typography variant="h6" color="primary.main" fontWeight="bold">
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 10, borderRadius: 1 }}
            />
          </Box>

          {status.stats && (
            <Box sx={{ mb: 3 }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                sx={{ 
                  '& > *': { 
                    flex: { xs: '1 1 auto', sm: '1 1 0' } 
                  } 
                }}
              >
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="text.primary" fontWeight="bold">
                    {status.stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {status.stats.succeeded}
                  </Typography>
                  <Typography variant="body2">
                    Sucessos
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {status.stats.failed}
                  </Typography>
                  <Typography variant="body2">
                    Falhas
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {status.stats.remaining}
                  </Typography>
                  <Typography variant="body2">
                    Restantes
                  </Typography>
                </Paper>
              </Stack>
            </Box>
          )}

          {status.etaSeconds && status.status === 'processing' && (
            <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Stack direction="row" alignItems="center" justifyContent="center">
                <AccessTime sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight="medium">
                  Tempo estimado: {formatTime(status.etaSeconds)}
                </Typography>
              </Stack>
            </Paper>
          )}

          {(status.status === 'completed' || status.status === 'failed') && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={2}>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  color="success"
                  startIcon={<Download />}
                  onClick={() => downloadFile('results')}
                  sx={{ py: 1.5 }}
                >
                  Baixar Sucessos
                </Button>
                
                {status.stats && status.stats.failed > 0 && (
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    color="error"
                    startIcon={<Download />}
                    onClick={() => downloadFile('errors')}
                    sx={{ py: 1.5 }}
                  >
                    Baixar Erros
                  </Button>
                )}
              </Stack>
            </>
          )}

          {(status.startedAt || status.finishedAt) && (
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                {status.startedAt && (
                  <>Iniciado em: {new Date(status.startedAt).toLocaleString('pt-BR')}</>
                )}
                {status.finishedAt && (
                  <Box component="span" display="block">
                    Finalizado em: {new Date(status.finishedAt).toLocaleString('pt-BR')}
                  </Box>
                )}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};