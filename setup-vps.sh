#!/bin/bash

# ============================================
# Script de Setup Inicial da VPS
# ============================================
# Este script prepara a VPS para receber o deploy automático
# via GitHub Actions ou manual
#
# Uso: ./setup-vps.sh
# Execute localmente e ele configura a VPS remotamente
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# CONFIGURAÇÕES
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setup Inicial da VPS - Front Boletos Gateway${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Solicitar informações da VPS
read -p "Digite o usuário e IP da VPS (ex: usuario@ip): " VPS_HOST
read -p "Digite a porta SSH (padrão 22): " VPS_PORT
VPS_PORT=${VPS_PORT:-22}

# Configurações do projeto
PROJECT_DIR="/opt/front-boletos-getway"  # Mantendo o nome do diretório do workflow
DOCKER_COMPOSE_VERSION="2.24.0"

# ============================================
# CRIAR SCRIPT REMOTO
# ============================================
cat > remote-setup.sh <<'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "📦 Atualizando sistema..."
sudo apt-get update
sudo apt-get upgrade -y

echo "🔧 Instalando dependências básicas..."
sudo apt-get install -y \
    curl \
    git \
    wget \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common

echo "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    # Adicionar repositório Docker oficial
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalar Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker $USER
    
    # Iniciar e habilitar Docker
    sudo systemctl start docker
    sudo systemctl enable docker
else
    echo "✅ Docker já está instalado"
fi

echo "🐳 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    # Instalar Docker Compose V2
    sudo curl -SL "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
else
    echo "✅ Docker Compose já está instalado"
fi

echo "📁 Criando estrutura de diretórios..."
sudo mkdir -p PROJECT_DIR
sudo chown -R $USER:$USER PROJECT_DIR

echo "🌐 Criando rede Docker..."
docker network create proxy-network 2>/dev/null || true

echo "🔒 Configurando firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

echo "✅ Setup básico concluído!"
REMOTE_SCRIPT

# Substituir variáveis no script
sed -i "s|PROJECT_DIR|${PROJECT_DIR}|g" remote-setup.sh

# ============================================
# EXECUTAR SETUP NA VPS
# ============================================
echo -e "${YELLOW}🚀 Conectando na VPS e executando setup...${NC}"
ssh -p ${VPS_PORT} ${VPS_HOST} "bash -s" < remote-setup.sh

# ============================================
# CRIAR DOCKER-COMPOSE NA VPS
# ============================================
echo -e "${YELLOW}📝 Criando docker-compose.yml na VPS...${NC}"

cat > docker-compose-vps.yml <<'EOF'
version: '3.8'

services:
  frontend:
    image: ghcr.io/diogenesmendes01/front-boletos-gatway:latest
    container_name: front-boletos-getway
    ports:
      - "${PORT:-3000}:80"
    environment:
      - NODE_ENV=production
      - TZ=America/Sao_Paulo
      - VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://api.envio-boleto.olympiabank.xyz}
      - VITE_MOCK_MODE=${VITE_MOCK_MODE:-false}
      - VITE_APP_ENVIRONMENT=${VITE_APP_ENVIRONMENT:-production}
    restart: unless-stopped
    networks:
      - proxy-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "com.olympiabank.service=frontend"
      - "com.olympiabank.environment=${ENVIRONMENT:-production}"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  proxy-network:
    external: true
    name: proxy-network
EOF

# Enviar docker-compose para VPS
scp -P ${VPS_PORT} docker-compose-vps.yml ${VPS_HOST}:${PROJECT_DIR}/docker-compose.yml

# ============================================
# CRIAR .env NA VPS
# ============================================
echo -e "${YELLOW}📝 Criando arquivo .env na VPS...${NC}"

cat > .env.production <<EOF
# Configurações de produção
VITE_API_BASE_URL=https://api.envio-boleto.olympiabank.xyz
VITE_MOCK_MODE=false
VITE_APP_ENVIRONMENT=production
PORT=3000
ENVIRONMENT=production
EOF

# Enviar .env para VPS
scp -P ${VPS_PORT} .env.production ${VPS_HOST}:${PROJECT_DIR}/.env

# ============================================
# CRIAR SCRIPTS AUXILIARES NA VPS
# ============================================
echo -e "${YELLOW}📝 Criando scripts auxiliares na VPS...${NC}"

# Script para ver logs
cat > view-logs.sh <<'EOF'
#!/bin/bash
cd /opt/front-boletos-getway
docker-compose logs -f --tail=100
EOF

# Script para restart
cat > restart-app.sh <<'EOF'
#!/bin/bash
cd /opt/front-boletos-getway
docker-compose down
docker-compose pull
docker-compose up -d
docker image prune -f
EOF

# Script para backup
cat > backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d-%H%M%S)

# Backup do docker-compose e .env
cd /opt/front-boletos-getway
tar -czf $BACKUP_DIR/config-backup-$DATE.tar.gz docker-compose.yml .env

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "config-backup-*.tar.gz" -mtime +7 -delete

echo "Backup salvo em: $BACKUP_DIR/config-backup-$DATE.tar.gz"
EOF

# Enviar scripts para VPS
scp -P ${VPS_PORT} view-logs.sh restart-app.sh backup.sh ${VPS_HOST}:${PROJECT_DIR}/
ssh -p ${VPS_PORT} ${VPS_HOST} "chmod +x ${PROJECT_DIR}/*.sh"

# ============================================
# CONFIGURAR NGINX (OPCIONAL)
# ============================================
echo -e "${YELLOW}🌐 Configurando Nginx como proxy reverso...${NC}"

cat > nginx-config.sh <<'NGINX_SCRIPT'
#!/bin/bash

# Instalar Nginx se não existir
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
fi

# Criar configuração do site
sudo tee /etc/nginx/sites-available/front-boletos > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/front-boletos /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar e recarregar Nginx
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx

echo "✅ Nginx configurado!"
NGINX_SCRIPT

read -p "Deseja configurar Nginx como proxy reverso? (y/n): " CONFIGURE_NGINX
if [[ $CONFIGURE_NGINX =~ ^[Yy]$ ]]; then
    ssh -p ${VPS_PORT} ${VPS_HOST} "bash -s" < nginx-config.sh
fi

# ============================================
# LIMPAR ARQUIVOS TEMPORÁRIOS
# ============================================
rm -f remote-setup.sh docker-compose-vps.yml .env.production
rm -f view-logs.sh restart-app.sh backup.sh nginx-config.sh

# ============================================
# INSTRUÇÕES FINAIS
# ============================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ VPS Configurada com Sucesso!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}📋 Próximos Passos:${NC}\n"

echo -e "${YELLOW}1. Configure os secrets no GitHub:${NC}"
echo "   - VPS_HOST: ${VPS_HOST#*@}"
echo "   - VPS_USER: ${VPS_HOST%@*}"
echo "   - VPS_SSH_KEY: (sua chave SSH privada)"
if [ "${VPS_PORT}" != "22" ]; then
    echo "   - VPS_PORT: ${VPS_PORT}"
fi

echo -e "\n${YELLOW}2. Faça o primeiro deploy manualmente:${NC}"
echo "   ssh -p ${VPS_PORT} ${VPS_HOST} 'cd ${PROJECT_DIR} && ./restart-app.sh'"

echo -e "\n${YELLOW}3. Comandos úteis:${NC}"
echo "   Ver logs:    ssh -p ${VPS_PORT} ${VPS_HOST} '${PROJECT_DIR}/view-logs.sh'"
echo "   Reiniciar:   ssh -p ${VPS_PORT} ${VPS_HOST} '${PROJECT_DIR}/restart-app.sh'"
echo "   Backup:      ssh -p ${VPS_PORT} ${VPS_HOST} '${PROJECT_DIR}/backup.sh'"

echo -e "\n${YELLOW}4. O deploy automático será ativado ao fazer push na branch main${NC}"

echo -e "\n${GREEN}🎉 Setup concluído!${NC}"