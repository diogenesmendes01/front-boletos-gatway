# Build stage - Dependências
FROM node:20-alpine AS deps

# Instalar dependências do sistema necessárias para compilação nativa
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    libc6-compat \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Limpar cache e instalar dependências
RUN npm cache clean --force && \
    npm ci --prefer-offline --no-audit --no-fund

# Build stage - Compilação
FROM node:20-alpine AS builder

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    libc6-compat \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar node_modules da etapa de dependências
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Configurar variáveis de ambiente para build
ENV NODE_ENV=production
ENV VITE_APP_ENVIRONMENT=production

# Reinstalar rollup e vite especificamente para garantir binários corretos
RUN npm rebuild rollup vite esbuild

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