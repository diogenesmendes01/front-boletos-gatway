#!/bin/bash

# Script para testar build do Docker localmente
# Ajuda a identificar e resolver problemas antes do deploy

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Teste de Build Docker - Front Boletos${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Limpar cache do Docker (opcional)
read -p "Limpar cache do Docker antes do build? (y/n): " CLEAR_CACHE
if [[ $CLEAR_CACHE =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Limpando cache do Docker...${NC}"
    docker builder prune -f
fi

# Escolher Dockerfile
echo -e "\n${YELLOW}Escolha o Dockerfile:${NC}"
echo "1) Dockerfile (Alpine - menor tamanho)"
echo "2) Dockerfile.production (Debian - mais compatível)"
echo "3) Dockerfile.alternative (se existir)"
read -p "Opção (1-3): " DOCKERFILE_OPTION

case $DOCKERFILE_OPTION in
    1)
        DOCKERFILE="Dockerfile"
        ;;
    2)
        DOCKERFILE="Dockerfile.production"
        ;;
    3)
        DOCKERFILE="Dockerfile.alternative"
        ;;
    *)
        DOCKERFILE="Dockerfile"
        ;;
esac

echo -e "\n${YELLOW}🏗️  Iniciando build com ${DOCKERFILE}...${NC}"

# Build com output detalhado
docker build \
    --progress=plain \
    --no-cache \
    -f ${DOCKERFILE} \
    -t test-front-boletos:latest \
    . 2>&1 | tee build.log

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Build concluído com sucesso!${NC}"
    
    # Mostrar tamanho da imagem
    echo -e "\n${BLUE}📊 Tamanho da imagem:${NC}"
    docker images test-front-boletos:latest
    
    # Perguntar se deseja rodar
    read -p "Deseja executar o container? (y/n): " RUN_CONTAINER
    if [[ $RUN_CONTAINER =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🚀 Iniciando container...${NC}"
        docker run -d --name test-front-boletos -p 3000:80 test-front-boletos:latest
        
        echo -e "${GREEN}✅ Container rodando em http://localhost:3000${NC}"
        echo -e "${YELLOW}Comandos úteis:${NC}"
        echo "  Ver logs:     docker logs test-front-boletos"
        echo "  Parar:        docker stop test-front-boletos"
        echo "  Remover:      docker rm test-front-boletos"
        
        # Testar health check
        sleep 3
        echo -e "\n${YELLOW}🏥 Testando health check...${NC}"
        curl -f http://localhost:3000/health && echo -e "${GREEN}✅ Health check OK${NC}" || echo -e "${RED}❌ Health check falhou${NC}"
    fi
else
    echo -e "\n${RED}❌ Build falhou! Verifique o arquivo build.log para mais detalhes${NC}"
    echo -e "${YELLOW}Últimas linhas do erro:${NC}"
    tail -20 build.log
    
    echo -e "\n${YELLOW}💡 Sugestões:${NC}"
    echo "1. Tente usar Dockerfile.production (mais compatível)"
    echo "2. Verifique se todas as dependências estão no package.json"
    echo "3. Execute 'npm install' e 'npm run build' localmente primeiro"
    echo "4. Limpe o cache: docker system prune -a"
fi

echo -e "\n${BLUE}Log completo salvo em: build.log${NC}"