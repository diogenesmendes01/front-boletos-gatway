import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Configuração para produção
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar MUI em chunk próprio
          mui: ['@mui/material', '@mui/icons-material'],
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  },
  
  // Preview (para testar build local)
  preview: {
    port: 3000,
    host: true
  },
  
  // Configuração de servidor dev
  server: {
    port: 3000,
    host: true
  }
})
