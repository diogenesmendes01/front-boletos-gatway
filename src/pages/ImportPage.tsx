import React, { useState } from 'react';
import {
  Box,
  Container,
  Button,
  Badge,
  Stack,
  Card,
  CardContent,
  Paper,
  Collapse,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  History,
  Info,
  Refresh,
  Add,
} from '@mui/icons-material';
import { FileUpload } from '../components/FileUpload';
import { ImportStatus } from '../components/ImportStatus';
import { UserHeader } from '../components/UserHeader';
import { useImportManager } from '../hooks/useImportManager';
import { useErrorHandler } from '../hooks/useErrorHandler';
import toast from 'react-hot-toast';

interface UploadOptions {
  fileType?: 'csv' | 'xlsx';
  delimiter?: ',' | ';' | '\t' | '|';
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'DD.MM.YYYY' | 'DD/MM/YY' | 'DD-MM-YY' | 'DD.MM.YY';
  decimalSeparator?: ',' | '.';
  webhookUrl?: string;
}

export const ImportPage: React.FC = () => {
  const [showHistory, setShowHistory] = useState(false);
  const { handleError } = useErrorHandler();
  
  const {
    imports,
    currentImport,
    isUploading,
    uploadFile,
    selectImport,
    clearCurrentImport,
    refreshImport,
  } = useImportManager();

  const handleUpload = async (file: File, options: UploadOptions) => {
    try {
      await uploadFile(file, options);
    } catch (error) {
      handleError(error);
    }
  };

  const handleComplete = () => {
    toast.success('Processamento concluído!');
  };

  const handleNewImport = () => {
    clearCurrentImport();
  };

  // Removido handleLogout pois agora está no UserHeader
  // const user = authService.getUser(); // Removido pois não é mais usado

  const selectHistoryItem = (importId: string) => {
    selectImport(importId);
    setShowHistory(false);
  };

  const handleRefreshAll = async () => {
    if (currentImport) {
      await refreshImport(currentImport.importId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'primary';
      case 'queued': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      queued: 'Na fila',
      processing: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou',
      canceled: 'Cancelado',
    };
    return labels[status] || status;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <UserHeader />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Botão de histórico */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            startIcon={<History />}
            onClick={() => setShowHistory(!showHistory)}
            variant="outlined"
            color="primary"
          >
            Histórico
            {imports.length > 0 && (
              <Badge
                badgeContent={imports.length}
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Button>
        </Box>

        <Collapse in={showHistory && imports.length > 0}>
          <Card sx={{ mb: 3 }} elevation={2}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Importações Recentes
                </Typography>
                <Tooltip title="Atualizar todas">
                  <IconButton onClick={handleRefreshAll} size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack spacing={1}>
                {imports.map((importItem) => (
                  <Button
                    key={importItem.importId}
                    onClick={() => selectHistoryItem(importItem.importId)}
                    variant="outlined"
                    sx={{
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      p: 2,
                      borderColor: currentImport?.importId === importItem.importId ? 'primary.main' : 'divider',
                    }}
                    fullWidth
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {importItem.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {importItem.uploadedAt.toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={getStatusLabel(importItem.status)}
                        color={getStatusColor(importItem.status) as 'success' | 'error' | 'primary' | 'warning' | 'default'}
                        size="small"
                      />
                      {importItem.stats && (
                        <Typography variant="caption" color="text.secondary">
                          {importItem.stats.succeeded}/{importItem.stats.total}
                        </Typography>
                      )}
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Collapse>

        {!currentImport ? (
          <Box>
            <FileUpload 
              onUpload={handleUpload} 
              isUploading={isUploading} 
            />
            
            <Container maxWidth="lg" sx={{ mt: 4 }}>
              <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
                <AlertTitle sx={{ fontWeight: 'bold' }}>
                  Como usar o importador
                </AlertTitle>
                <Box component="ol" sx={{ pl: 2, mt: 2, '& li': { mb: 1 } }}>
                  <li>
                    <strong>1.</strong> Prepare seu arquivo CSV ou XLSX com as colunas obrigatórias:
                    <br />
                    <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, borderRadius: 1 }}>
                      amount, name, document, telefone, email, vencimento
                    </Typography>
                  </li>
                  <li>
                    <strong>2.</strong> Certifique-se de que o arquivo tem no máximo 2.000 linhas
                  </li>
                  <li>
                    <strong>3.</strong> Faça o upload e acompanhe o processamento em tempo real
                  </li>
                  <li>
                    <strong>4.</strong> Baixe os relatórios de sucesso e erro após a conclusão
                  </li>
                </Box>
              </Alert>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 2 }}>
                <Paper elevation={2} sx={{ p: 3, textAlign: 'center', flex: 1 }}>
                  <Typography variant="h3" fontWeight="bold" color="primary.main" gutterBottom>
                    2.000
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Linhas máximas por arquivo
                  </Typography>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, textAlign: 'center', flex: 1 }}>
                  <Typography variant="h3" fontWeight="bold" color="success.main" gutterBottom>
                    10MB
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tamanho máximo do arquivo
                  </Typography>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, textAlign: 'center', flex: 1 }}>
                  <Typography variant="h3" fontWeight="bold" color="secondary.main" gutterBottom>
                    CSV/XLSX
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Formatos aceitos
                  </Typography>
                </Paper>
              </Stack>
            </Container>
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                onClick={handleNewImport}
                variant="contained"
                size="large"
                startIcon={<Add />}
                sx={{ px: 4, py: 1.5 }}
              >
                Nova Importação
              </Button>
            </Box>
            
            <ImportStatus
              importId={currentImport.importId}
              onComplete={handleComplete}
              useSSE={true}
            />
          </Box>
        )}
      </Container>

      <Box component="footer" sx={{ mt: 'auto', bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', py: 2 }}>
        <Container maxWidth="xl">
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
            © 2025 Importador de Boletos - OlympiaBank Integration
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};