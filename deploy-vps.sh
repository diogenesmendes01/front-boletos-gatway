#!/bin/bash

# ============================================
# Script de Deploy para VPS - Front-end Boletos Gateway
# ============================================
# Este script automatiza o deploy do front-end React/Vite em uma VPS
# Suporta deploy via Docker ou direto com PM2 + Nginx
#
# Uso: ./deploy-vps.sh [método] [vps-host]
# Exemplos:
#   ./deploy-vps.sh docker usuario@ip-da-vps
#   ./deploy-vps.sh pm2 usuario@ip-da-vps
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# CONFIGURAÇÕES DO PROJETO
# ============================================
PROJECT_NAME="front-boletos-gateway"
DEPLOY_METHOD=${1:-docker}  # docker ou pm2
VPS_HOST=${2:-""}           # usuario@ip-da-vps
VPS_DIR="/opt/apps/${PROJECT_NAME}"
NGINX_SITE="${PROJECT_NAME}"
NODE_VERSION="20"
PM2_APP_NAME="${PROJECT_NAME}"
DOCKER_IMAGE_NAME="${PROJECT_NAME}"
DOCKER_CONTAINER_NAME="${PROJECT_NAME}-container"

# Variáveis de ambiente da aplicação
VITE_API_BASE_URL=${VITE_API_BASE_URL:-"https://api.envio-boleto.olympiabank.xyz"}
VITE_MOCK_MODE=${VITE_MOCK_MODE:-"false"}
VITE_APP_ENVIRONMENT=${VITE_APP_ENVIRONMENT:-"production"}
PORT=${PORT:-3000}

# ============================================
# FUNÇÕES UTILITÁRIAS
# ============================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

check_requirements() {
    print_header "Verificando requisitos locais"
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js não encontrado${NC}"
        exit 1
    fi
    
    # Verificar NPM
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ NPM não encontrado${NC}"
        exit 1
    fi
    
    # Verificar package.json
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json não encontrado. Execute na raiz do projeto.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Todos os requisitos locais atendidos${NC}"
}

# ============================================
# BUILD LOCAL
# ============================================

build_local() {
    print_header "Fazendo build da aplicação"
    
    # Instalar dependências
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm ci --silent
    
    # Build da aplicação
    echo -e "${YELLOW}🏗️  Buildando aplicação...${NC}"
    npm run build
    
    # Verificar se o build foi criado
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Erro: diretório 'dist' não foi criado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Build concluído com sucesso${NC}"
}

# ============================================
# DEPLOY VIA DOCKER
# ============================================

deploy_docker() {
    print_header "Deploy via Docker para VPS"
    
    if [ -z "$VPS_HOST" ]; then
        echo -e "${RED}❌ Host da VPS não especificado. Use: ./deploy-vps.sh docker usuario@ip${NC}"
        exit 1
    fi
    
    # Criar arquivo .env para produção
    cat > .env.production <<EOF
VITE_API_BASE_URL=${VITE_API_BASE_URL}
VITE_MOCK_MODE=${VITE_MOCK_MODE}
VITE_APP_ENVIRONMENT=${VITE_APP_ENVIRONMENT}
PORT=${PORT}
EOF
    
    # Criar script de setup remoto
    cat > setup-docker-remote.sh <<'SCRIPT'
#!/bin/bash
set -e

# Instalar Docker se não existir
if ! command -v docker &> /dev/null; then
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Instalar Docker Compose se não existir
if ! command -v docker-compose &> /dev/null; then
    echo "Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Criar diretório do projeto
sudo mkdir -p PROJECT_DIR
sudo chown -R $USER:$USER PROJECT_DIR

# Criar rede Docker se não existir
docker network create proxy-network 2>/dev/null || true

echo "✅ Setup Docker concluído"
SCRIPT
    
    # Substituir variáveis no script
    sed -i "s|PROJECT_DIR|${VPS_DIR}|g" setup-docker-remote.sh
    
    echo -e "${YELLOW}📤 Enviando arquivos para VPS...${NC}"
    
    # Copiar arquivos necessários
    ssh $VPS_HOST "bash -s" < setup-docker-remote.sh
    
    # Criar tarball dos arquivos necessários
    tar czf deploy-package.tar.gz \
        Dockerfile \
        docker-compose.yml \
        nginx.conf \
        .env.production \
        package*.json \
        tsconfig*.json \
        vite.config.ts \
        index.html \
        public/ \
        src/
    
    # Enviar e extrair na VPS
    scp deploy-package.tar.gz $VPS_HOST:/tmp/
    ssh $VPS_HOST "cd ${VPS_DIR} && tar xzf /tmp/deploy-package.tar.gz && rm /tmp/deploy-package.tar.gz"
    
    # Fazer deploy com Docker Compose
    echo -e "${YELLOW}🐳 Fazendo deploy com Docker...${NC}"
    ssh $VPS_HOST "cd ${VPS_DIR} && docker-compose down || true"
    ssh $VPS_HOST "cd ${VPS_DIR} && docker-compose build --no-cache"
    ssh $VPS_HOST "cd ${VPS_DIR} && docker-compose up -d"
    
    # Limpar arquivos temporários
    rm -f setup-docker-remote.sh deploy-package.tar.gz .env.production
    
    echo -e "${GREEN}✅ Deploy Docker concluído!${NC}"
    echo -e "${BLUE}📍 Aplicação rodando em http://${VPS_HOST#*@}:${PORT}${NC}"
}

# ============================================
# DEPLOY VIA PM2 + NGINX
# ============================================

deploy_pm2() {
    print_header "Deploy via PM2 + Nginx para VPS"
    
    if [ -z "$VPS_HOST" ]; then
        echo -e "${RED}❌ Host da VPS não especificado. Use: ./deploy-vps.sh pm2 usuario@ip${NC}"
        exit 1
    fi
    
    # Build local primeiro
    build_local
    
    # Criar script de setup remoto
    cat > setup-pm2-remote.sh <<'SCRIPT'
#!/bin/bash
set -e

# Instalar Node.js via NVM se não existir
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install NODE_VERSION
    nvm use NODE_VERSION
    nvm alias default NODE_VERSION
fi

# Instalar PM2 globalmente
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Instalar Nginx se não existir
if ! command -v nginx &> /dev/null; then
    echo "Instalando Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Criar diretório do projeto
sudo mkdir -p PROJECT_DIR
sudo chown -R $USER:$USER PROJECT_DIR

echo "✅ Setup PM2 + Nginx concluído"
SCRIPT
    
    # Substituir variáveis no script
    sed -i "s|NODE_VERSION|${NODE_VERSION}|g" setup-pm2-remote.sh
    sed -i "s|PROJECT_DIR|${VPS_DIR}|g" setup-pm2-remote.sh
    
    # Executar setup na VPS
    echo -e "${YELLOW}🔧 Configurando ambiente na VPS...${NC}"
    ssh $VPS_HOST "bash -s" < setup-pm2-remote.sh
    
    # Criar servidor Express para servir o build
    cat > server.js <<'EOF'
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Servir arquivos estáticos
app.use(express.static(DIST_DIR));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Redirecionar todas as rotas para index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
EOF
    
    # Criar configuração PM2
    cat > ecosystem.config.js <<EOF
module.exports = {
    apps: [{
        name: '${PM2_APP_NAME}',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: ${PORT}
        },
        error_file: 'logs/error.log',
        out_file: 'logs/out.log',
        log_file: 'logs/combined.log',
        time: true
    }]
};
EOF
    
    # Criar configuração Nginx
    cat > nginx-site.conf <<EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:${PORT};
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:${PORT}/health;
    }
}
EOF
    
    # Enviar arquivos para VPS
    echo -e "${YELLOW}📤 Enviando arquivos para VPS...${NC}"
    
    # Criar tarball com build e configurações
    tar czf deploy-pm2.tar.gz dist/ server.js ecosystem.config.js package*.json
    
    # Enviar e extrair
    scp deploy-pm2.tar.gz $VPS_HOST:/tmp/
    ssh $VPS_HOST "cd ${VPS_DIR} && tar xzf /tmp/deploy-pm2.tar.gz && rm /tmp/deploy-pm2.tar.gz"
    
    # Instalar dependências de produção
    echo -e "${YELLOW}📦 Instalando dependências de produção...${NC}"
    ssh $VPS_HOST "cd ${VPS_DIR} && npm install express"
    
    # Configurar PM2
    echo -e "${YELLOW}🚀 Iniciando aplicação com PM2...${NC}"
    ssh $VPS_HOST "cd ${VPS_DIR} && pm2 delete ${PM2_APP_NAME} 2>/dev/null || true"
    ssh $VPS_HOST "cd ${VPS_DIR} && pm2 start ecosystem.config.js"
    ssh $VPS_HOST "pm2 save && pm2 startup systemd -u $USER --hp /home/$USER || true"
    
    # Configurar Nginx
    echo -e "${YELLOW}🔧 Configurando Nginx...${NC}"
    scp nginx-site.conf $VPS_HOST:/tmp/
    ssh $VPS_HOST "sudo mv /tmp/nginx-site.conf /etc/nginx/sites-available/${NGINX_SITE}"
    ssh $VPS_HOST "sudo ln -sf /etc/nginx/sites-available/${NGINX_SITE} /etc/nginx/sites-enabled/"
    ssh $VPS_HOST "sudo nginx -t && sudo systemctl reload nginx"
    
    # Limpar arquivos temporários
    rm -f setup-pm2-remote.sh deploy-pm2.tar.gz server.js ecosystem.config.js nginx-site.conf
    
    echo -e "${GREEN}✅ Deploy PM2 + Nginx concluído!${NC}"
    echo -e "${BLUE}📍 Aplicação rodando em http://${VPS_HOST#*@}${NC}"
}

# ============================================
# COMANDOS ÚTEIS
# ============================================

show_commands() {
    print_header "Comandos úteis para gerenciar o deploy"
    
    echo -e "${YELLOW}Docker:${NC}"
    echo "  ssh $VPS_HOST 'cd ${VPS_DIR} && docker-compose logs -f'        # Ver logs"
    echo "  ssh $VPS_HOST 'cd ${VPS_DIR} && docker-compose restart'        # Reiniciar"
    echo "  ssh $VPS_HOST 'cd ${VPS_DIR} && docker-compose down'           # Parar"
    echo ""
    echo -e "${YELLOW}PM2:${NC}"
    echo "  ssh $VPS_HOST 'pm2 logs ${PM2_APP_NAME}'                       # Ver logs"
    echo "  ssh $VPS_HOST 'pm2 restart ${PM2_APP_NAME}'                    # Reiniciar"
    echo "  ssh $VPS_HOST 'pm2 stop ${PM2_APP_NAME}'                       # Parar"
    echo "  ssh $VPS_HOST 'pm2 monit'                                      # Monitorar"
}

# ============================================
# SCRIPT DE ROLLBACK
# ============================================

create_rollback_script() {
    cat > rollback-vps.sh <<'EOF'
#!/bin/bash
# Script de rollback para o deploy

VPS_HOST=$1
BACKUP_TAG=$2

if [ -z "$VPS_HOST" ] || [ -z "$BACKUP_TAG" ]; then
    echo "Uso: ./rollback-vps.sh usuario@ip tag-backup"
    exit 1
fi

echo "Fazendo rollback para versão $BACKUP_TAG..."

# Docker rollback
ssh $VPS_HOST "docker pull front-boletos-gateway:$BACKUP_TAG"
ssh $VPS_HOST "cd /opt/apps/front-boletos-gateway && docker-compose down"
ssh $VPS_HOST "docker tag front-boletos-gateway:$BACKUP_TAG front-boletos-gateway:latest"
ssh $VPS_HOST "cd /opt/apps/front-boletos-gateway && docker-compose up -d"

echo "✅ Rollback concluído"
EOF
    chmod +x rollback-vps.sh
    echo -e "${GREEN}✅ Script de rollback criado: rollback-vps.sh${NC}"
}

# ============================================
# MAIN
# ============================================

main() {
    print_header "Deploy VPS - ${PROJECT_NAME}"
    
    # Verificar requisitos
    check_requirements
    
    # Escolher método de deploy
    case $DEPLOY_METHOD in
        docker)
            deploy_docker
            ;;
        pm2)
            deploy_pm2
            ;;
        *)
            echo -e "${RED}❌ Método inválido. Use: docker ou pm2${NC}"
            echo "Exemplo: ./deploy-vps.sh docker usuario@ip-da-vps"
            exit 1
            ;;
    esac
    
    # Criar script de rollback
    create_rollback_script
    
    # Mostrar comandos úteis
    show_commands
    
    echo -e "\n${GREEN}🎉 Deploy concluído com sucesso!${NC}"
}

# Executar script principal
main