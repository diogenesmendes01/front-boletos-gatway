# Build stage
FROM node:18-alpine AS builder

# Instalar dependências do sistema necessárias
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Configurar npm para produção e instalar dependências
RUN npm config set registry https://registry.npmjs.org/ && \
    npm cache clean --force && \
    npm ci --silent --no-optional --prefer-offline

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