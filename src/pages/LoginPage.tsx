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
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !token) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      // Check if in development mode and validate mock credentials
      if (import.meta.env.DEV || import.meta.env.VITE_MOCK_MODE === 'true') {
        if (apiService.isValidMockCredentials(email, token)) {
          apiService.setToken(token);
          localStorage.setItem('userEmail', email);
          toast.success('Login realizado com sucesso!');
          navigate('/');
          return;
        } else {
          setError('Credenciais inválidas. Use as credenciais de teste fornecidas.');
          return;
        }
      }

      // Production login logic (original code)
      apiService.setToken(token);
      localStorage.setItem('userEmail', email);
      
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (err) {
      setError('Token inválido. Verifique suas credenciais.');
      apiService.clearToken();
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
              </Box>
            </Stack>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  type="email"
                  label="E-mail"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: <Email sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  variant="outlined"
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
                🚀 Credenciais para Teste
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