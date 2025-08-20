import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Close,
  Info,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onUpload: (file: File, options: UploadOptions) => void;
  isUploading: boolean;
}

interface UploadOptions {
  fileType?: 'csv' | 'xlsx';
  delimiter?: ',' | ';';
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY';
  webhookUrl?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 2000;
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx'];

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isUploading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<',' | ';'>(',');
  const [dateFormat, setDateFormat] = useState<'YYYY-MM-DD' | 'DD/MM/YYYY'>('YYYY-MM-DD');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Tipo de arquivo inválido. Use apenas ${ALLOWED_EXTENSIONS.join(' ou ')}`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande. Tamanho máximo: 10MB';
    }

    return null;
  };

  const validateCSVHeaders = async (file: File): Promise<boolean> => {
    const requiredHeaders = ['amount', 'name', 'document', 'telefone', 'email', 'vencimento'];
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        if (lines.length === 0) {
          toast.error('Arquivo vazio');
          resolve(false);
          return;
        }

        if (lines.length > MAX_ROWS + 1) {
          toast.error(`Arquivo excede o limite de ${MAX_ROWS} linhas`);
          resolve(false);
          return;
        }

        const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim());
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast.error(`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}`);
          resolve(false);
          return;
        }

        const preview = lines.slice(0, 5).map(line => line.split(delimiter));
        setPreviewData(preview);

        resolve(true);
      };
      reader.readAsText(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setSelectedFile(file);

    if (file.name.endsWith('.csv')) {
      const isValid = await validateCSVHeaders(file);
      if (!isValid) {
        setSelectedFile(null);
        return;
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const options: UploadOptions = {
      fileType: selectedFile.name.endsWith('.xlsx') ? 'xlsx' : 'csv',
      delimiter,
      dateFormat,
    };

    if (webhookUrl.trim()) {
      options.webhookUrl = webhookUrl.trim();
    }

    onUpload(selectedFile, options);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
            Importar Boletos
          </Typography>

          <Paper
            sx={{
              border: 2,
              borderColor: dragActive ? 'primary.main' : 'grey.300',
              borderStyle: 'dashed',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragActive ? 'action.hover' : 'transparent',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'grey.400',
                backgroundColor: 'action.hover',
              },
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              disabled={isUploading}
              style={{ display: 'none' }}
            />

            {selectedFile ? (
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                  <InsertDriveFile color="primary" sx={{ fontSize: 48 }} />
                  <Box textAlign="left">
                    <Typography variant="h6" component="div">
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(selectedFile.size)}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    disabled={isUploading}
                    color="error"
                  >
                    <Close />
                  </IconButton>
                </Stack>
              </Box>
            ) : (
              <Box>
                <CloudUpload color="action" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Arraste e solte seu arquivo aqui
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  ou
                </Typography>
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUpload />}
                  disabled={isUploading}
                >
                  Selecionar Arquivo
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                  CSV ou XLSX • Máx. 2.000 linhas • Máx. 10MB
                </Typography>
              </Box>
            )}
          </Paper>

          {selectedFile && (
            <Box sx={{ mt: 3 }}>
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <FormControl fullWidth>
                    <InputLabel>Delimitador (CSV)</InputLabel>
                    <Select
                      value={delimiter}
                      label="Delimitador (CSV)"
                      onChange={(e) => setDelimiter(e.target.value as ',' | ';')}
                      disabled={selectedFile.name.endsWith('.xlsx') || isUploading}
                    >
                      <MenuItem value=",">Vírgula (,)</MenuItem>
                      <MenuItem value=";">Ponto e vírgula (;)</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Formato de Data</InputLabel>
                    <Select
                      value={dateFormat}
                      label="Formato de Data"
                      onChange={(e) => setDateFormat(e.target.value as 'YYYY-MM-DD' | 'DD/MM/YYYY')}
                      disabled={isUploading}
                    >
                      <MenuItem value="YYYY-MM-DD">AAAA-MM-DD</MenuItem>
                      <MenuItem value="DD/MM/YYYY">DD/MM/AAAA</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <TextField
                  fullWidth
                  type="url"
                  label="Webhook URL (opcional)"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://exemplo.com/webhook"
                  disabled={isUploading}
                />
              </Stack>

              {previewData.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Prévia do arquivo:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {previewData[0]?.map((header, index) => (
                            <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.slice(1, 3).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              <Alert severity="info" sx={{ mt: 3 }} icon={<Info />}>
                <AlertTitle>Formato obrigatório do arquivo</AlertTitle>
                <Typography variant="body2">
                  • Primeira linha: cabeçalho com colunas obrigatórias<br />
                  • Colunas: <strong>amount, name, document, telefone, email, vencimento</strong><br />
                  • Máximo de 2.000 linhas de dados
                </Typography>
              </Alert>

              {isUploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Enviando arquivo...
                  </Typography>
                </Box>
              )}

              <Button
                fullWidth
                size="large"
                variant="contained"
                onClick={handleUpload}
                disabled={isUploading}
                startIcon={<CloudUpload />}
                sx={{ mt: 3, py: 1.5 }}
              >
                {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};