import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Stack,
  Container,
} from '@mui/material';
import {
  Lock,
  Email,
  Login,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { config } from '../config/environment';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica dos campos
    if (!email.trim() || !token.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      if (config.app.mockMode) {
        // Modo desenvolvimento - usar credenciais mock
        if (apiService.isValidMockCredentials(email, token)) {
          apiService.setToken(token);
          localStorage.setItem('userEmail', email);
          toast.success('Login realizado com sucesso!');
          navigate('/import');
        } else {
          setError('Credenciais inválidas. Use as credenciais de teste fornecidas.');
        }
      } else {
        // Modo produção - salvar credenciais sem validar
        apiService.setToken(token);
        localStorage.setItem('userEmail', email);
        toast.success('Credenciais salvas com sucesso!');
        navigate('/import');
      }
    } catch (error) {
      setError('Erro ao fazer login');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card 
          elevation={10}
          sx={{
            borderRadius: 3,
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack alignItems="center" spacing={3} sx={{ mb: 4 }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  color: 'white',
                }}
              >
                <Lock sx={{ fontSize: 40 }} />
              </Paper>
              
              <Box textAlign="center">
                <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                  Bem-vindo
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Importador de Boletos - OlympiaBank
                </Typography>
                {!config.app.mockMode && (
                  <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block' }}>
                    Modo Produção
                  </Typography>
                )}
              </Box>
            </Stack>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  type="email"
                  label="E-mail (identificador)"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: <Email sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  variant="outlined"
                  helperText="Email para identificação (pode ser qualquer um)"
                />

                <TextField
                  fullWidth
                  type="password"
                  label="Token de API"
                  placeholder="Bearer token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: <Lock sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  variant="outlined"
                  helperText="Chave de acesso fornecida pela OlympiaBank"
                />

                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="large"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Login />}
                  sx={{
                    py: 1.5,
                    mt: 2,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1976d2 30%, #1e88e5 90%)',
                    },
                  }}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </Stack>
            </Box>

            {config.app.mockMode ? (
              <Paper
                elevation={1}
                sx={{
                  mt: 4,
                  p: 3,
                  bgcolor: 'success.light',
                  color: 'success.contrastText',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  🚀 Credenciais para Teste (Modo Desenvolvimento)
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Use uma das combinações abaixo para entrar:
                </Typography>
                
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    <strong>E-mail:</strong> demo@olympiabank.com<br />
                    <strong>Token:</strong> demo-token-123
                  </Typography>
                </Box>
                
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    <strong>E-mail:</strong> teste@olympiabank.com<br />
                    <strong>Token:</strong> teste-token-456
                  </Typography>
                </Box>
                
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    <strong>E-mail:</strong> admin@olympiabank.com<br />
                    <strong>Token:</strong> admin-token-789
                  </Typography>
                </Box>
                
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Modo desenvolvimento ativo - APIs mockadas
                </Typography>
              </Paper>
            ) : (
              <Paper
                elevation={1}
                sx={{
                  mt: 4,
                  p: 3,
                  bgcolor: 'info.light',
                  color: 'info.contrastText',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  ℹ️ Modo Produção
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Em produção, você pode usar:
                </Typography>
                
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1, mb: 1 }}>
                  <Typography variant="body2">
                    • <strong>Qualquer email</strong> para identificação
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Seu token real</strong> fornecido pela OlympiaBank
                  </Typography>
                </Box>
                
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 2 }}>
                  O token será validado automaticamente nas chamadas para a API
                </Typography>
              </Paper>
            )}
          </CardContent>
        </Card>

        <Typography 
          variant="caption" 
          color="white" 
          display="block" 
          textAlign="center" 
          sx={{ mt: 3, opacity: 0.8 }}
        >
          © 2025 Importador de Boletos. Todos os direitos reservados.
        </Typography>
      </Container>
    </Box>
  );
};