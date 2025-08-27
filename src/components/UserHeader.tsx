import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Menu,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Business,
  Email,
  Lock,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { ChangePasswordModal } from './ChangePasswordModal';
import toast from 'react-hot-toast';

export const UserHeader: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();
  const user = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChangePassword = () => {
    setAnchorEl(null);
    setShowChangePassword(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Logout realizado com sucesso');
      navigate('/login');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        mb: 3
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div" sx={{ mr: 3, fontWeight: 'bold' }}>
            Importador de Boletos
          </Typography>
          
          <Chip
            label="PRODUÇÃO"
            size="small"
            color="success"
            variant="outlined"
            sx={{ 
              color: 'white', 
              borderColor: 'white',
              '& .MuiChip-label': { color: 'white' }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Informações da empresa */}
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'medium' }}>
              {user.companyName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {user.companyDocument}
            </Typography>
          </Box>

          {/* Avatar e menu do usuário */}
          <Tooltip title="Menu do usuário">
            <IconButton
              size="large"
              aria-label="menu do usuário"
              aria-controls={open ? 'user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleMenu}
              sx={{ color: 'white' }}
            >
              <AccountCircle />
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          id="user-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 3,
            sx: { minWidth: 250 }
          }}
        >
          <MenuItem disabled>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Email color="action" />
              <Box>
                <Typography variant="body2" color="text.primary">
                  {user.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Usuário
                </Typography>
              </Box>
            </Box>
          </MenuItem>
          
          <MenuItem disabled>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Business color="action" />
              <Box>
                <Typography variant="body2" color="text.primary">
                  {user.companyName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Empresa
                </Typography>
              </Box>
            </Box>
          </MenuItem>
          
          <MenuItem onClick={handleChangePassword}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock color="action" />
              <Typography>Alterar Senha</Typography>
            </Box>
          </MenuItem>
          
          <MenuItem onClick={handleLogout}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Logout color="action" />
              <Typography>Sair</Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>

      {/* Modal de Alterar Senha */}
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </AppBar>
  );
};
