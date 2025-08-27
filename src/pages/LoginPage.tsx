import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { authService } from '../services/authService';
import { config } from '../config/environment';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica dos campos
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Autenticação real - sempre usar API de produção
      const result = await authService.login(email, password);
      toast.success(`Login realizado com sucesso! Bem-vindo, ${result.companyName}`);
      navigate('/import');
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
                <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block' }}>
                  Ambiente: {config.app.environment === 'production' ? 'Produção' : 'Desenvolvimento'}
                </Typography>
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
                  label="Senha"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: <Lock sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  variant="outlined"
                  helperText="Senha para autenticação"
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

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Não tem uma conta?{' '}
                    <Link to="/register" style={{ color: '#2196F3', textDecoration: 'none' }}>
                      Criar conta
                    </Link>
                  </Typography>
                </Box>
              </Stack>
            </Box>

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
                🔐 Autenticação por Email e Senha
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                O sistema usa autenticação JWT real:
              </Typography>
              
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1, mb: 1 }}>
                <Typography variant="body2">
                  • <strong>Email:</strong> para identificação do usuário
                </Typography>
                <Typography variant="body2">
                  • <strong>Senha:</strong> para autenticação
                </Typography>
              </Box>
              
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <strong>API:</strong> {config.api.baseUrl || 'localhost'}
                </Typography>
              </Box>
              
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 2 }}>
                O sistema gera automaticamente um JWT válido por 30 dias com refresh automático
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