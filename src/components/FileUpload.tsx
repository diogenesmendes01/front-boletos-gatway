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
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Close,
  Info,
  Warning,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { config } from '../config/environment';

interface FileUploadProps {
  onUpload: (file: File, options: UploadOptions) => void;
  isUploading: boolean;
}

interface UploadOptions {
  fileType?: 'csv' | 'xlsx';
  delimiter?: ',' | ';' | '\t' | '|';
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'DD.MM.YYYY' | 'DD/MM/YY' | 'DD-MM-YY' | 'DD.MM.YY';
  decimalSeparator?: ',' | '.';
  webhookUrl?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  previewData: string[][];
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isUploading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<',' | ';' | '\t' | '|'>(';');
  const [dateFormat, setDateFormat] = useState<'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'DD.MM.YYYY' | 'DD/MM/YY' | 'DD-MM-YY' | 'DD.MM.YY'>('YYYY-MM-DD');
  const [decimalSeparator, setDecimalSeparator] = useState<',' | '.'>(',');
  
  // Função para detectar automaticamente o delimitador
  const detectDelimiter = (content: string): ',' | ';' | '\t' | '|' => {
    const firstLine = content.split('\n')[0];
    const delimiters = config.validation.supportedDelimiters;
    
    for (const delim of delimiters) {
      if (firstLine.includes(delim)) {
        const parts = firstLine.split(delim);
        if (parts.length >= config.validation.requiredHeaders.length) {
          return delim;
        }
      }
    }
    
    return ';'; // Padrão brasileiro
  };
  const [webhookUrl, setWebhookUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.validation.allowedExtensions.includes(extension)) {
      errors.push(`Tipo de arquivo inválido. Use apenas ${config.validation.allowedExtensions.join(' ou ')}`);
    }

    if (file.size > config.app.maxFileSize) {
      const maxSizeMB = config.app.maxFileSize / (1024 * 1024);
      errors.push(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
    }

    return errors;
  };

  const validateFileContent = async (file: File): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let previewData: string[][] = [];

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          errors.push('Arquivo vazio');
          resolve({ isValid: false, errors, warnings, previewData });
          return;
        }

        if (lines.length > config.app.maxRows + 1) {
          errors.push(`Arquivo excede o limite de ${config.app.maxRows} linhas`);
        }

        // Detectar delimitador automaticamente
        const detectedDelimiter = detectDelimiter(text);
        if (detectedDelimiter !== delimiter) {
          console.log(`🔄 Delimitador detectado: ${detectedDelimiter}, ajustando...`);
          setDelimiter(detectedDelimiter);
        }

        const headers = lines[0].toLowerCase().split(detectedDelimiter).map(h => h.trim());
        
        // Debug: log dos cabeçalhos encontrados e esperados
        console.log('🔍 Cabeçalhos encontrados:', headers);
        console.log('🔍 Cabeçalhos esperados:', config.validation.requiredHeaders);
        console.log('🔍 Delimitador usado:', detectedDelimiter);
        console.log('🔍 Linha original:', lines[0]);
        
        // Validação mais robusta - verificar se há correspondência parcial
        const missingHeaders = config.validation.requiredHeaders.filter(requiredHeader => {
          const found = headers.some(header => 
            header === requiredHeader || 
            header.includes(requiredHeader) || 
            requiredHeader.includes(header)
          );
          return !found;
        });
        
        if (missingHeaders.length > 0) {
          errors.push(`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}`);
          console.log('❌ Cabeçalhos ausentes:', missingHeaders);
        }

        // Verificar se há colunas extras
        const extraHeaders = headers.filter(h => !config.validation.requiredHeaders.includes(h));
        if (extraHeaders.length > 0) {
          warnings.push(`Colunas extras detectadas: ${extraHeaders.join(', ')}`);
        }

        // Validar formato das primeiras linhas de dados
        if (lines.length > 1) {
          const dataLines = lines.slice(1, Math.min(6, lines.length));
          previewData = [headers, ...dataLines.map(line => line.split(detectedDelimiter))];
          
          // Validação básica de dados
          dataLines.forEach((line, index) => {
            const cells = line.split(detectedDelimiter);
            if (cells.length !== headers.length) {
              warnings.push(`Linha ${index + 2}: número de colunas inconsistente`);
            }
          });
        }

        const isValid = errors.length === 0;
        resolve({ isValid, errors, warnings, previewData });
      };
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        // Para XLSX, assumimos que é válido e validamos no backend
        previewData = [config.validation.requiredHeaders];
        resolve({ isValid: true, errors, warnings, previewData });
      }
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
    setIsValidating(true);
    
    try {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        fileErrors.forEach(error => toast.error(error));
        return;
      }

      setSelectedFile(file);
      const validation = await validateFileContent(file);
      setValidationResult(validation);

      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        setSelectedFile(null);
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => toast(warning, { icon: '⚠️' }));
      }

      toast.success('Arquivo validado com sucesso!');
    } catch (error) {
      toast.error('Erro ao validar arquivo');
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !validationResult?.isValid) return;

    const options: UploadOptions = {
      fileType: selectedFile.name.endsWith('.xlsx') ? 'xlsx' : 'csv',
      delimiter,
      dateFormat,
      decimalSeparator,
    };

    if (webhookUrl.trim()) {
      options.webhookUrl = webhookUrl.trim();
    }

    onUpload(selectedFile, options);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setValidationResult(null);
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

  const getValidationStatusColor = () => {
    if (!validationResult) return 'default';
    if (validationResult.isValid) return 'success';
    return 'error';
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
              disabled={isUploading || isValidating}
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
                    {validationResult && (
                      <Chip
                        label={validationResult.isValid ? 'Válido' : 'Inválido'}
                        color={getValidationStatusColor()}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    disabled={isUploading || isValidating}
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
                  disabled={isUploading || isValidating}
                >
                  Selecionar Arquivo
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                  CSV ou XLSX • Máx. {config.app.maxRows} linhas • Máx. {config.app.maxFileSize / (1024 * 1024)}MB
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  Colunas obrigatórias: name, document, publicArea, number, neighborhood, city, state, postalCode, amount, dueDate, description
                </Typography>
              </Box>
            )}
          </Paper>

          {(isValidating || isUploading) && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {isValidating ? 'Validando arquivo...' : 'Enviando arquivo...'}
              </Typography>
            </Box>
          )}

          {selectedFile && validationResult?.isValid && (
            <Box sx={{ mt: 3 }}>
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <FormControl fullWidth>
                    <InputLabel>Delimitador (CSV)</InputLabel>
                    <Select
                      value={delimiter}
                      label="Delimitador (CSV)"
                      onChange={(e) => setDelimiter(e.target.value as ',' | ';' | '\t' | '|')}
                      disabled={selectedFile.name.endsWith('.xlsx') || isUploading}
                    >
                      {config.validation.supportedDelimiters.map(d => (
                        <MenuItem key={d} value={d}>
                          {d === ',' ? 'Vírgula (,)' : 
                           d === ';' ? 'Ponto e vírgula (;)' :
                           d === '\t' ? 'Tabulação (Tab)' :
                           d === '|' ? 'Barra vertical (|)' : d}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Formato de Data</InputLabel>
                    <Select
                      value={dateFormat}
                      label="Formato de Data"
                      onChange={(e) => setDateFormat(e.target.value as 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'DD.MM.YYYY' | 'DD/MM/YY' | 'DD-MM-YY' | 'DD.MM.YY')}
                      disabled={isUploading}
                    >
                      {config.validation.supportedDateFormats.map(format => (
                        <MenuItem key={format} value={format}>
                          {format === 'YYYY-MM-DD' ? 'AAAA-MM-DD' : 
                           format === 'DD/MM/YYYY' ? 'DD/MM/AAAA' :
                           format === 'DD-MM-YYYY' ? 'DD-MM-AAAA' :
                           format === 'DD.MM.YYYY' ? 'DD.MM.AAAA' :
                           format === 'DD/MM/YY' ? 'DD/MM/AA' :
                           format === 'DD-MM-YY' ? 'DD-MM-AA' :
                           format === 'DD.MM.YY' ? 'DD.MM.AA' : format}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Separador Decimal</InputLabel>
                    <Select
                      value={decimalSeparator}
                      label="Separador Decimal"
                      onChange={(e) => setDecimalSeparator(e.target.value as ',' | '.')}
                      disabled={isUploading}
                    >
                      {config.validation.supportedDecimalSeparators.map(sep => (
                        <MenuItem key={sep} value={sep}>
                          {sep === ',' ? 'Vírgula (,) - 1.234,56' : 'Ponto (.) - 1,234.56'}
                        </MenuItem>
                      ))}
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
                  helperText="URL para notificação quando o processamento for concluído"
                />
              </Stack>

              {validationResult.previewData.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Prévia do arquivo:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {validationResult.previewData[0]?.map((header, index) => (
                            <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validationResult.previewData.slice(1, 4).map((row, rowIndex) => (
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

              {validationResult.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 3 }} icon={<Warning />}>
                  <AlertTitle>Atenção</AlertTitle>
                  <Typography variant="body2">
                    {validationResult.warnings.map((warning, index) => (
                      <Box key={index} component="span" display="block">
                        • {warning}
                      </Box>
                    ))}
                  </Typography>
                </Alert>
              )}

              <Alert severity="info" sx={{ mt: 3 }} icon={<Info />}>
                <AlertTitle>Formato obrigatório do arquivo</AlertTitle>
                <Typography variant="body2">
                  • Primeira linha: cabeçalho com colunas obrigatórias<br />
                  • Colunas obrigatórias: <strong>name, document, publicArea, number, neighborhood, city, state, postalCode, amount, dueDate, description</strong><br />
                  • Máximo de {config.app.maxRows} linhas de dados<br />
                  • <strong>Sequência:</strong> Nome, Documento, Logradouro, Número, Bairro, Cidade, Estado, CEP, Valor, Data de Vencimento, Descrição<br />
                  • <strong>Formatos suportados:</strong> CSV (; , Tab |) • Datas (DD/MM/AAAA, AAAA-MM-DD, DD-MM-AAAA, DD.MM.AAAA) • Decimais (, .)
                </Typography>
              </Alert>

              <Button
                fullWidth
                size="large"
                variant="contained"
                onClick={handleUpload}
                disabled={isUploading || isValidating}
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