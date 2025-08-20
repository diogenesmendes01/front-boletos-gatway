import React, { useState } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Badge,
  Stack,
  Card,
  CardContent,
  Paper,
  Collapse,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Description,
  History,
  Logout,
  Info,
} from '@mui/icons-material';
import { FileUpload } from '../components/FileUpload';
import { ImportStatus } from '../components/ImportStatus';
import { apiService } from '../services/api';
import { useErrorHandler } from '../hooks/useErrorHandler';
import toast from 'react-hot-toast';

interface UploadOptions {
  fileType?: 'csv' | 'xlsx';
  delimiter?: ',' | ';';
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY';
  webhookUrl?: string;
}

export const ImportPage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { handleError } = useErrorHandler();

  const handleUpload = async (file: File, options: UploadOptions) => {
    setIsUploading(true);
    
    try {
      const response = await apiService.uploadImport(file, options);
      toast.success('Arquivo enviado com sucesso!');
      setCurrentImportId(response.importId);
      
      setImportHistory(prev => [response.importId, ...prev].slice(0, 10));
    } catch (error) {
      handleError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = () => {
    toast.success('Processamento concluído!');
  };

  const handleNewImport = () => {
    setCurrentImportId(null);
  };

  const handleLogout = () => {
    apiService.clearToken();
    window.location.href = '/login';
  };

  const selectHistoryItem = (importId: string) => {
    setCurrentImportId(importId);
    setShowHistory(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1 }}>
            <Description color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" component="h1" fontWeight="bold">
                Importador de Boletos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                OlympiaBank Integration
              </Typography>
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<History />}
              onClick={() => setShowHistory(!showHistory)}
              color="inherit"
              sx={{ mr: 1 }}
            >
              Histórico
              {importHistory.length > 0 && (
                <Badge
                  badgeContent={importHistory.length}
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </Button>
            
            <Button
              startIcon={<Logout />}
              onClick={handleLogout}
              color="error"
              variant="outlined"
            >
              Sair
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Collapse in={showHistory && importHistory.length > 0}>
          <Card sx={{ mb: 3 }} elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Importações Recentes
              </Typography>
              <Stack spacing={1}>
                {importHistory.map((id) => (
                  <Button
                    key={id}
                    onClick={() => selectHistoryItem(id)}
                    variant="outlined"
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      p: 2,
                    }}
                    fullWidth
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Import ID: {id.substring(0, 8)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Clique para ver detalhes
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Collapse>

        {!currentImportId ? (
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
                sx={{ px: 4, py: 1.5 }}
              >
                Nova Importação
              </Button>
            </Box>
            
            <ImportStatus
              importId={currentImportId}
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