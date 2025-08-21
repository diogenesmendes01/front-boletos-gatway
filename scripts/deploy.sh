#!/bin/bash

# Script de deploy manual para OlympiaBank Frontend
# Uso: ./scripts/deploy.sh [environment]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
ENVIRONMENT=${1:-production}
REGISTRY="ghcr.io"
IMAGE_NAME="olympiabank/front-boletos-gatway-frontend"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}🚀 Iniciando deploy para ambiente: ${ENVIRONMENT}${NC}"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: package.json não encontrado. Execute este script na raiz do projeto.${NC}"
    exit 1
fi

# Build da aplicação
echo -e "${YELLOW}🏗️  Building aplicação...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    npm run build
else
    npm run build:dev || npm run build
fi

# Build da imagem Docker
echo -e "${YELLOW}🐳 Building imagem Docker...${NC}"
docker build \
    --build-arg VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://api.envio-boleto.olympiabank.xyz} \
    --build-arg VITE_MOCK_MODE=${VITE_MOCK_MODE:-false} \
    --build-arg VITE_APP_ENVIRONMENT=$ENVIRONMENT \
    --build-arg BUILD_DATE=$(date -Iseconds) \
    --build-arg VERSION=$TIMESTAMP \
    -t $REGISTRY/$IMAGE_NAME:latest \
    -t $REGISTRY/$IMAGE_NAME:$TIMESTAMP \
    .

echo -e "${GREEN}✅ Build concluído!${NC}"

# Perguntar se deseja fazer push
read -p "Deseja fazer push da imagem para o registry? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📤 Fazendo push para o registry...${NC}"
    docker push $REGISTRY/$IMAGE_NAME:latest
    docker push $REGISTRY/$IMAGE_NAME:$TIMESTAMP
    echo -e "${GREEN}✅ Push concluído!${NC}"
fi

# Perguntar se deseja executar localmente
read -p "Deseja executar a aplicação localmente? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🏃 Iniciando aplicação localmente...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Aplicação rodando em http://localhost:3000${NC}"
    echo -e "${YELLOW}Para ver os logs: docker-compose logs -f${NC}"
    echo -e "${YELLOW}Para parar: docker-compose down${NC}"
fi

echo -e "${GREEN}🎉 Deploy script finalizado!${NC}"