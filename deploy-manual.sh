#!/bin/bash

# ============================================
# Script de Deploy Manual - Compatível com GitHub Actions
# ============================================
# Este script permite fazer deploy manual usando a mesma
# imagem Docker que o GitHub Actions constrói
#
# Uso: ./deploy-manual.sh [ambiente]
# Exemplos:
#   ./deploy-manual.sh             # Deploy em produção
#   ./deploy-manual.sh staging     # Deploy em staging
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
ENVIRONMENT=${1:-production}
REGISTRY="ghcr.io"
IMAGE_NAME="diogenesmendes01/front-boletos-gatway"
VPS_DIR="/opt/front-boletos-getway"

# Verificar arquivo de configuração
if [ -f ".deploy.conf" ]; then
    source .deploy.conf
else
    echo -e "${YELLOW}⚠️  Arquivo .deploy.conf não encontrado${NC}"
    echo -e "${YELLOW}Criando arquivo de configuração...${NC}"
    
    read -p "Digite o usuário e IP da VPS (ex: usuario@ip): " VPS_HOST
    read -p "Digite a porta SSH (padrão 22): " VPS_PORT
    VPS_PORT=${VPS_PORT:-22}
    
    cat > .deploy.conf <<EOF
# Configurações de Deploy
VPS_HOST="${VPS_HOST}"
VPS_PORT="${VPS_PORT}"
EOF
    
    echo -e "${GREEN}✅ Arquivo .deploy.conf criado${NC}"
    source .deploy.conf
fi

# ============================================
# FUNÇÕES
# ============================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

check_vps_setup() {
    print_header "Verificando setup da VPS"
    
    ssh -p ${VPS_PORT} ${VPS_HOST} "test -d ${VPS_DIR}" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ VPS não está configurada!${NC}"
        echo -e "${YELLOW}Execute primeiro: ./setup-vps.sh${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ VPS está configurada${NC}"
}

build_local() {
    print_header "Build Local da Imagem Docker"
    
    read -p "Deseja fazer build local? (y/n): " BUILD_LOCAL
    if [[ ! $BUILD_LOCAL =~ ^[Yy]$ ]]; then
        return
    fi
    
    echo -e "${YELLOW}🏗️  Buildando imagem Docker...${NC}"
    
    # Build com as mesmas configurações do GitHub Actions
    docker build \
        --build-arg VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://api.envio-boleto.olympiabank.xyz} \
        --build-arg VITE_MOCK_MODE=${VITE_MOCK_MODE:-false} \
        --build-arg VITE_APP_ENVIRONMENT=${ENVIRONMENT} \
        -t ${REGISTRY}/${IMAGE_NAME}:latest \
        -t ${REGISTRY}/${IMAGE_NAME}:manual-$(date +%Y%m%d-%H%M%S) \
        .
    
    echo -e "${GREEN}✅ Build concluído${NC}"
    
    read -p "Deseja fazer push para o registry? (y/n): " PUSH_IMAGE
    if [[ $PUSH_IMAGE =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📤 Fazendo push para registry...${NC}"
        echo -e "${YELLOW}Faça login no GitHub Container Registry:${NC}"
        docker login ${REGISTRY}
        
        docker push ${REGISTRY}/${IMAGE_NAME}:latest
        echo -e "${GREEN}✅ Push concluído${NC}"
    fi
}

deploy_to_vps() {
    print_header "Deploy para VPS"
    
    echo -e "${YELLOW}🚀 Iniciando deploy para ${ENVIRONMENT}...${NC}"
    
    # Script de deploy remoto
    ssh -p ${VPS_PORT} ${VPS_HOST} <<'REMOTE_DEPLOY'
        set -e
        
        cd /opt/front-boletos-getway
        
        # Fazer backup
        if [ -f "backup.sh" ]; then
            echo "📦 Fazendo backup..."
            ./backup.sh || true
        fi
        
        # Detectar versão do Docker Compose
        if docker compose version >/dev/null 2>&1; then 
            COMPOSE="docker compose"
        else 
            COMPOSE="docker-compose"
        fi
        
        # Pull da imagem
        echo "📥 Baixando nova imagem..."
        $COMPOSE pull
        
        # Parar container antigo
        echo "⏹️  Parando container antigo..."
        $COMPOSE down || true
        
        # Iniciar novo container
        echo "▶️  Iniciando novo container..."
        $COMPOSE up -d
        
        # Limpar imagens antigas
        docker image prune -f
        
        # Verificar status
        sleep 5
        if docker ps | grep -q "front-boletos-getway"; then
            echo "✅ Container rodando!"
            docker ps | grep front-boletos-getway
        else
            echo "❌ Container não está rodando!"
            docker logs front-boletos-getway --tail 50
            exit 1
        fi
REMOTE_DEPLOY
    
    echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
}

rollback() {
    print_header "Rollback"
    
    echo -e "${YELLOW}📋 Listando imagens disponíveis...${NC}"
    
    ssh -p ${VPS_PORT} ${VPS_HOST} "docker images ${REGISTRY}/${IMAGE_NAME} --format 'table {{.Tag}}\t{{.CreatedSince}}\t{{.Size}}'"
    
    read -p "Digite a tag para rollback (ou 'cancel' para cancelar): " ROLLBACK_TAG
    
    if [ "$ROLLBACK_TAG" = "cancel" ]; then
        echo -e "${YELLOW}Rollback cancelado${NC}"
        return
    fi
    
    ssh -p ${VPS_PORT} ${VPS_HOST} <<ROLLBACK
        cd /opt/front-boletos-getway
        
        # Fazer backup antes do rollback
        if [ -f "backup.sh" ]; then
            ./backup.sh || true
        fi
        
        # Atualizar docker-compose para usar a tag específica
        sed -i "s|image: .*|image: ${REGISTRY}/${IMAGE_NAME}:${ROLLBACK_TAG}|" docker-compose.yml
        
        # Restart com a nova imagem
        if docker compose version >/dev/null 2>&1; then 
            COMPOSE="docker compose"
        else 
            COMPOSE="docker-compose"
        fi
        
        $COMPOSE down
        $COMPOSE up -d
        
        echo "✅ Rollback para ${ROLLBACK_TAG} concluído!"
ROLLBACK
}

show_logs() {
    print_header "Logs da Aplicação"
    
    echo -e "${YELLOW}📜 Mostrando logs (Ctrl+C para sair)...${NC}"
    ssh -p ${VPS_PORT} ${VPS_HOST} "cd ${VPS_DIR} && docker-compose logs -f --tail=100"
}

show_status() {
    print_header "Status da Aplicação"
    
    ssh -p ${VPS_PORT} ${VPS_HOST} <<'STATUS'
        echo "🐳 Containers Docker:"
        docker ps | grep front-boletos || echo "Nenhum container rodando"
        
        echo -e "\n💾 Uso de disco:"
        df -h /opt/front-boletos-getway
        
        echo -e "\n🔧 Versão atual:"
        docker images ghcr.io/diogenesmendes01/front-boletos-gatway --format "{{.Tag}}" | head -1
        
        echo -e "\n🌐 Teste de health:"
        curl -s http://localhost:3000/health || echo "Health check falhou"
STATUS
}

# ============================================
# MENU INTERATIVO
# ============================================

show_menu() {
    print_header "Deploy Manual - Front Boletos Gateway"
    
    echo "1) Deploy completo (build + deploy)"
    echo "2) Deploy apenas (usar imagem existente)"
    echo "3) Build local apenas"
    echo "4) Rollback para versão anterior"
    echo "5) Ver logs"
    echo "6) Ver status"
    echo "7) Restart aplicação"
    echo "8) Sair"
    echo ""
    read -p "Escolha uma opção: " choice
    
    case $choice in
        1)
            check_vps_setup
            build_local
            deploy_to_vps
            ;;
        2)
            check_vps_setup
            deploy_to_vps
            ;;
        3)
            build_local
            ;;
        4)
            check_vps_setup
            rollback
            ;;
        5)
            show_logs
            ;;
        6)
            show_status
            ;;
        7)
            ssh -p ${VPS_PORT} ${VPS_HOST} "cd ${VPS_DIR} && ./restart-app.sh"
            ;;
        8)
            echo -e "${GREEN}Saindo...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida${NC}"
            ;;
    esac
    
    echo ""
    read -p "Pressione Enter para continuar..."
    show_menu
}

# ============================================
# MAIN
# ============================================

# Se executado sem argumentos, mostrar menu
if [ $# -eq 0 ]; then
    show_menu
else
    # Execução direta
    check_vps_setup
    deploy_to_vps
fi