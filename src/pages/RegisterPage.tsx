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
  Person,
  Email,
  Business,
  VpnKey,
  Lock,
  ArrowBack,
} from '@mui/icons-material';
import { config } from '../config/environment';
import toast from 'react-hot-toast';

interface RegisterData {
  email: string;
  username: string;
  companyName: string;
  companyDocument: string;
  password: string;
}

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    username: '',
    companyName: '',
    companyDocument: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica dos campos
    if (!formData.email.trim() || !formData.username.trim() || 
        !formData.companyName.trim() || !formData.companyDocument.trim() || 
        !formData.password.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Chamada para API de registro
      const response = await fetch(`${config.api.baseUrl}/v1/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Falha no cadastro: ${response.status}`);
      }
      
      await response.json();
      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
      navigate('/login');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer cadastro');
      console.error('Register error:', error);
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
      <Container maxWidth="md">
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
                <Person sx={{ fontSize: 40 }} />
              </Paper>
              
              <Box textAlign="center">
                <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                  Criar Conta
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Cadastro - Importador de Boletos
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block' }}>
                  Ambiente: {config.app.environment === 'production' ? 'Produção' : 'Desenvolvimento'}
                </Typography>
              </Box>
            </Stack>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    fullWidth
                    type="email"
                    label="E-mail"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: <Email sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                    variant="outlined"
                    required
                    sx={{ minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}
                  />

                  <TextField
                    fullWidth
                    label="Nome Completo"
                    placeholder="Seu nome completo"
                    value={formData.username}
                    onChange={handleInputChange('username')}
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: <Person sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                    variant="outlined"
                    required
                    sx={{ minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    fullWidth
                    label="Nome da Empresa"
                    placeholder="Nome da sua empresa"
                    value={formData.companyName}
                    onChange={handleInputChange('companyName')}
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: <Business sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                    variant="outlined"
                    required
                    sx={{ minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}
                  />

                  <TextField
                    fullWidth
                    label="CNPJ"
                    placeholder="00.000.000/0000-00"
                    value={formData.companyDocument}
                    onChange={handleInputChange('companyDocument')}
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: <VpnKey sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                    variant="outlined"
                    required
                    sx={{ minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}
                  />
                </Box>

                <TextField
                  fullWidth
                  type="password"
                  label="Senha"
                  placeholder="Sua senha"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: <Lock sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  variant="outlined"
                  helperText="Mínimo de 6 caracteres"
                  required
                />
              </Stack>

              {error && (
                <Alert severity="error" sx={{ borderRadius: 2, mt: 3 }}>
                  {error}
                </Alert>
              )}

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  to="/login"
                  startIcon={<ArrowBack />}
                  variant="outlined"
                  sx={{ flex: 1 }}
                >
                  Voltar ao Login
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Person />}
                  sx={{
                    flex: 2,
                    py: 1.5,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1976d2 30%, #1e88e5 90%)',
                    },
                  }}
                >
                  {isLoading ? 'Criando Conta...' : 'Criar Conta'}
                </Button>
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
                ℹ️ Informações do Cadastro
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Após o cadastro, você poderá fazer login com seu email e senha:
              </Typography>
              
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 1, mb: 1 }}>
                <Typography variant="body2">
                  • <strong>Email:</strong> será usado para login
                </Typography>
                <Typography variant="body2">
                  • <strong>Senha:</strong> para autenticação
                </Typography>
                <Typography variant="body2">
                  • <strong>Dados da empresa:</strong> para identificação
                </Typography>
              </Box>
              
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 2 }}>
                API: {config.api.baseUrl || 'localhost'}
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
