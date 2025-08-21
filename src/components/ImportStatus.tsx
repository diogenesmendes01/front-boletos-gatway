import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  AccessTime,
  Download,
  Error as ErrorIcon,
  Refresh,
  Info,
} from '@mui/icons-material';
import type { ImportStatusResponse, ImportStatus as ImportStatusType } from '../types/import.types';
import { apiService } from '../services/api';
import { config } from '../config/environment';
import toast from 'react-hot-toast';

interface ImportStatusProps {
  importId: string;
  onComplete?: () => void;
  useSSE?: boolean;
}

// Cache simples para status de importações
const statusCache = new Map<string, { data: ImportStatusResponse; timestamp: number }>();
const CACHE_TTL = 30000; // 30 segundos

export const ImportStatus: React.FC<ImportStatusProps> = ({ 
  importId, 
  onComplete,
  useSSE = true 
}) => {
  const [status, setStatus] = useState<ImportStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStatus = useCallback(async (forceRefresh = false) => {
    try {
      // Verificar cache primeiro
      if (!forceRefresh && statusCache.has(importId)) {
        const cached = statusCache.get(importId)!;
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          setStatus(cached.data);
          setLastUpdate(new Date(cached.timestamp));
          return;
        }
      }

      const data = await apiService.getImportStatus(importId);
      
      // Atualizar cache
      statusCache.set(importId, { data, timestamp: Date.now() });
      
      setStatus(data);
      setLastUpdate(new Date());
      setError(null);

      if (data.status === 'completed' || data.status === 'failed' || data.status === 'canceled') {
        setIsPolling(false);
        if (onComplete) onComplete();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Erro ao buscar status';
      setError(errorMessage);
      console.error('Error fetching status:', err);
      
      // Se for erro 404, pode ser que a importação ainda não foi processada
      if (err.response?.status === 404) {
        toast.error('Importação não encontrada. Verifique se o ID está correto.');
      }
    }
  }, [importId, onComplete]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus(true);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchStatus();

    if (useSSE) {
      const unsubscribe = apiService.subscribeToProgress(
        importId,
        (data) => {
          setStatus((prev) => {
            if (!prev) return prev;
            
            const updated = {
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
            
            // Atualizar cache
            statusCache.set(importId, { data: updated, timestamp: Date.now() });
            
            return updated;
          });

          if (data.status) {
            setStatus((prev) => {
              if (!prev) return prev;
              const updated = { ...prev, status: data.status };
              statusCache.set(importId, { data: updated, timestamp: Date.now() });
              return updated;
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
          toast.error('Conexão SSE perdida. Usando atualização automática.');
        }
      );

      return () => unsubscribe();
    } else {
      const interval = setInterval(() => {
        if (isPolling) {
          fetchStatus();
        }
      }, config.app.pollingInterval);

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

  const getStatusDescription = (): string => {
    if (!status) return '';
    
    switch (status.status) {
      case 'queued':
        return 'Seu arquivo está na fila de processamento. Aguarde um momento.';
      case 'processing':
        return 'Seu arquivo está sendo processado. Isso pode levar alguns minutos.';
      case 'completed':
        return 'Processamento concluído com sucesso! Você pode baixar os resultados.';
      case 'failed':
        return 'O processamento falhou. Verifique os erros e tente novamente.';
      case 'canceled':
        return 'O processamento foi cancelado.';
      default:
        return '';
    }
  };

  const progress = useMemo(() => calculateProgress(), [status?.stats]);

  if (error) {
    return (
      <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          <Typography variant="h6" component="div" gutterBottom>
            Erro ao carregar status
          </Typography>
          {error}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={isRefreshing}
              startIcon={<Refresh />}
            >
              Tentar Novamente
            </Button>
          </Box>
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

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h4" component="h1">
                Status da Importação
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  icon={getStatusIcon(status.status)}
                  label={getStatusLabel(status.status)}
                  color={getStatusColor(status.status) as any}
                  sx={{ px: 2, py: 1 }}
                />
                <Tooltip title="Atualizar status">
                  <IconButton
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    size="small"
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ID: {importId}
            </Typography>

            <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
              {getStatusDescription()}
            </Alert>

            {lastUpdate && (
              <Typography variant="caption" color="text.secondary">
                Última atualização: {lastUpdate.toLocaleString('pt-BR')}
              </Typography>
            )}
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