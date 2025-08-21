# 📝 Checklist React + Vite - Preparar para Docker

> **IMPORTANTE:** Stack detectada: **React 19 + TypeScript + Vite 7 + MUI v7**  
> Você só precisa mexer no CÓDIGO do repositório. Infraestrutura já configurada!

---

## 🎯 SEU TRABALHO
Fazer o código **React + Vite** rodar no **Docker** e conectar com a **API**.

**🌐 Informações importantes:**
- **Sua API:** https://api.envio-boleto.olympiabank.xyz
- **Seu site ficará:** https://envio-boleto.olympiabank.xyz
- **Container:** `front-boletos-gateway`

---

## ✅ ARQUIVOS QUE VOCÊ DEVE CRIAR NO REPOSITÓRIO

### **1. 📁 `Dockerfile` (raiz do projeto)**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build com Vite
RUN npm run build

# Production stage
FROM nginx:alpine

# Copiar build do Vite para nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração customizada do nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expor porta
EXPOSE 80

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
```

### **2. 📁 `nginx.conf` (raiz do projeto)**

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Main server
    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;
        
        # Handle React Router (SPA)
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # API proxy (opcional - se quiser chamar /api/* no frontend)
        location /api/ {
            proxy_pass https://api.envio-boleto.olympiabank.xyz/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
```

### **3. 📁 `.dockerignore` (raiz do projeto)**
```
node_modules
.git
dist
.env.local
.env.development
.env.test
.env.production
npm-debug.log*
yarn-debug.log*
yarn-error.log*
README.md
.gitignore
Dockerfile
nginx.conf
coverage
.nyc_output
.vite
```

### **4. 📁 `.github/workflows/deploy.yml`**
```yaml
name: Deploy React Frontend

on:
  push:
    branches: [main, master]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build with Vite
        run: npm run build

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: 168.231.92.229
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/front-boletos-getway
            docker-compose pull
            docker-compose up -d
            docker image prune -f
```

---

## ⚙️ CONFIGURAÇÕES OBRIGATÓRIAS

### **Vite - VERIFICAR `vite.config.ts`:**
```typescript
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
```

### **TypeScript - VERIFICAR `vite-env.d.ts`:**
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // adicione outras envs aqui
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## 🔗 CONECTAR COM A API

### **Configuração de ambiente:**
```typescript
// src/config/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.envio-boleto.olympiabank.xyz';

export { API_BASE_URL };
```

### **Service da API (TypeScript):**
```typescript
// src/services/api.ts
import { API_BASE_URL } from '../config/api';

interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

class ApiService {
  private baseURL = API_BASE_URL;

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Métodos HTTP
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Métodos específicos da API
  async getBoletos() {
    return this.get('/v1/boletos');
  }

  async createBoleto(data: unknown) {
    return this.post('/v1/boletos', data);
  }

  async getHealth() {
    return this.get('/v1/health');
  }
}

export const apiService = new ApiService();
```

### **Hook customizado React:**
```typescript
// src/hooks/useApi.ts
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useApi<T>(endpoint: string, options?: RequestInit): UseApiState<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const result = await apiService.get<T>(endpoint);
        setState({ data: result.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error as Error 
        });
      }
    };

    fetchData();
  }, [endpoint]);

  return state;
}

// Exemplo de uso:
// const { data: boletos, loading, error } = useApi<Boleto[]>('/v1/boletos');
```

### **Context para estado global (opcional):**
```typescript
// src/context/AppContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { apiService } from '../services/api';

interface AppContextType {
  apiService: typeof apiService;
  // outros estados globais
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const value: AppContextType = {
    apiService,
    // outros valores
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

---

## 🧪 TESTAR ANTES DO DEPLOY

### **1. Testar build Vite:**
```bash
npm run build
```
**Deve criar pasta `dist/` com arquivos**

### **2. Testar preview local:**
```bash
npm run preview
```
**Abrir:** http://localhost:3000

### **3. Testar Docker local (opcional):**
```bash
docker build -t test-frontend .
docker run -p 8080:80 test-frontend
```
**Abrir:** http://localhost:8080

### **4. Testar API:**
```bash
curl https://api.envio-boleto.olympiabank.xyz/v1/health
```

---

## ⚙️ SCRIPTS DO PACKAGE.JSON

**Verificar se tem estes scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 🚀 COMO FAZER DEPLOY

```bash
git add .
git commit -m "Configuração Docker para React + Vite"
git push origin main
```

**Acompanhar:** GitHub → Actions → Ver se passou ✅

---

## ❌ PROBLEMAS COMUNS

### **Build falha:**
- ✅ Rode `npm run build` local e veja erros
- ✅ Verifique erros de TypeScript: `npm run type-check`
- ✅ Confirme que MUI está instalado corretamente

### **Docker falha:**
- ✅ Verifique se criou `nginx.conf`
- ✅ Confirme que build gera pasta `dist/`
- ✅ Teste Docker local

### **Deploy falha:**
- ✅ Veja logs na aba "Actions"
- ✅ Confirme estrutura de pastas

### **Site não carrega:**
- ✅ Aguarde 2-3 minutos
- ✅ Limpe cache (Ctrl+F5)
- ✅ Verifique React Router nas rotas

---

## ✅ CHECKLIST FINAL

**Antes do commit:**

- [ ] ✅ Criei `Dockerfile` na raiz
- [ ] ✅ Criei `nginx.conf` na raiz
- [ ] ✅ Criei `.dockerignore` na raiz  
- [ ] ✅ Criei `.github/workflows/deploy.yml`
- [ ] ✅ Configurei API service para usar `https://api.envio-boleto.olympiabank.xyz`
- [ ] ✅ Testei `npm run build` - gera pasta `dist/` ✅
- [ ] ✅ Testei `npm run preview` - funciona ✅
- [ ] ✅ Fiz commit e push

**Após o push:**
- [ ] ✅ GitHub Actions executou sem erros
- [ ] ✅ Site funcionando em https://envio-boleto.olympiabank.xyz

---

## 🎉 RESULTADO

- **React 19 + TypeScript** rodando em Docker
- **MUI v7** estilizado e funcionando  
- **Vite 7** build otimizado
- **Deploy automático** a cada push
- **API conectada** e funcionando
- **React Router** com SPA funcionando

**🚀 Boa codificação com React + Vite!**