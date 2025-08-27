import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { authService } from '../services/authService';
import { config } from '../config/environment';
import toast from 'react-hot-toast';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
}) => {
  const [formData, setFormData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof ChangePasswordData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(''); // Limpar erro ao digitar
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica dos campos
    if (!formData.currentPassword.trim() || !formData.newPassword.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('A nova senha deve ser diferente da senha atual');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      // Chamada para API de alterar senha
      const response = await fetch(`${config.api.baseUrl}/v1/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Falha ao alterar senha: ${response.status}`);
      }
      
      await response.json();
      toast.success('Senha alterada com sucesso!');
      
      // Limpar formulário e fechar modal
      setFormData({ currentPassword: '', newPassword: '' });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao alterar senha');
      console.error('Change password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ currentPassword: '', newPassword: '' });
      setError('');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 3, 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Alterar Senha
          </Typography>
        </Box>
        <IconButton
          aria-label="fechar"
          onClick={handleClose}
          disabled={isLoading}
          sx={{ color: 'grey.500' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Para alterar sua senha, informe a senha atual e a nova senha desejada.
            </Typography>

            <TextField
              fullWidth
              type={showCurrentPassword ? 'text' : 'password'}
              label="Senha Atual"
              placeholder="Sua senha atual"
              value={formData.currentPassword}
              onChange={handleInputChange('currentPassword')}
              disabled={isLoading}
              InputProps={{
                startAdornment: <Lock sx={{ color: 'action.active', mr: 1 }} />,
                endAdornment: (
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                    disabled={isLoading}
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              variant="outlined"
              required
            />

            <TextField
              fullWidth
              type={showNewPassword ? 'text' : 'password'}
              label="Nova Senha"
              placeholder="Nova senha desejada"
              value={formData.newPassword}
              onChange={handleInputChange('newPassword')}
              disabled={isLoading}
              InputProps={{
                startAdornment: <Lock sx={{ color: 'action.active', mr: 1 }} />,
                endAdornment: (
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    disabled={isLoading}
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              variant="outlined"
              helperText="Mínimo de 6 caracteres"
              required
            />

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          variant="outlined"
          sx={{ minWidth: 100 }}
        >
          Cancelar
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Lock />}
          sx={{
            minWidth: 140,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976d2 30%, #1e88e5 90%)',
            },
          }}
        >
          {isLoading ? 'Alterando...' : 'Alterar Senha'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
