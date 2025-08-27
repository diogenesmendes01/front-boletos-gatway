#!/bin/bash

# ============================================
# Script para Configurar Autenticação GHCR na VPS
# ============================================
# Este script configura o login no GitHub Container Registry
# para permitir pull de imagens privadas
#
# Uso: ./fix-ghcr-auth.sh
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Configuração de Autenticação GHCR${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verificar configuração
if [ -f ".deploy.conf" ]; then
    source .deploy.conf
else
    read -p "Digite o usuário e IP da VPS (ex: usuario@ip): " VPS_HOST
    read -p "Digite a porta SSH (padrão 22): " VPS_PORT
    VPS_PORT=${VPS_PORT:-22}
fi

echo -e "${YELLOW}Para configurar o acesso ao GitHub Container Registry, você precisa:${NC}"
echo "1. Um Personal Access Token (PAT) do GitHub"
echo "2. Permissões: read:packages"
echo ""
echo -e "${BLUE}Como criar o token:${NC}"
echo "1. Acesse: https://github.com/settings/tokens/new"
echo "2. Nome: 'GHCR VPS Access'"
echo "3. Expiração: 90 dias (ou mais)"
echo "4. Marque: read:packages"
echo "5. Clique em 'Generate token'"
echo ""

read -p "Você já tem um Personal Access Token? (y/n): " HAS_TOKEN

if [[ ! $HAS_TOKEN =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Crie o token seguindo as instruções acima e execute este script novamente.${NC}"
    exit 0
fi

# Solicitar credenciais
read -p "Digite seu usuário do GitHub: " GITHUB_USER
read -s -p "Digite seu Personal Access Token: " GITHUB_TOKEN
echo ""

# Opção 1: Configurar manualmente na VPS
echo -e "\n${YELLOW}Opção 1: Configuração Manual (Recomendado)${NC}"
echo "Execute estes comandos na sua VPS:"
echo ""
echo "ssh -p ${VPS_PORT} ${VPS_HOST}"
echo "echo '${GITHUB_TOKEN}' | docker login ghcr.io -u ${GITHUB_USER} --password-stdin"
echo ""

# Opção 2: Configurar automaticamente
read -p "Deseja configurar automaticamente? (y/n): " AUTO_CONFIG

if [[ $AUTO_CONFIG =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔧 Configurando autenticação na VPS...${NC}"
    
    ssh -p ${VPS_PORT} ${VPS_HOST} <<EOF
        # Login no GHCR
        echo "${GITHUB_TOKEN}" | docker login ghcr.io -u ${GITHUB_USER} --password-stdin
        
        # Testar pull da imagem
        echo "🧪 Testando pull da imagem..."
        docker pull ghcr.io/diogenesmendes01/front-boletos-gatway:latest || {
            echo "❌ Falha ao fazer pull da imagem"
            echo "Verifique se:"
            echo "1. O token tem permissão read:packages"
            echo "2. O nome da imagem está correto"
            echo "3. A imagem foi publicada no GHCR"
            exit 1
        }
        
        echo "✅ Autenticação configurada com sucesso!"
EOF
    
    echo -e "${GREEN}✅ Configuração concluída!${NC}"
fi

# Opção 3: Usar imagem pública
echo -e "\n${YELLOW}Opção Alternativa: Tornar a imagem pública${NC}"
echo "1. Acesse: https://github.com/users/diogenesmendes01/packages/container/front-boletos-gatway/settings"
echo "2. Em 'Danger Zone', clique em 'Change visibility'"
echo "3. Selecione 'Public' e confirme"
echo ""
echo "Isso permitirá que qualquer um faça pull da imagem sem autenticação."

# Criar script de verificação
cat > check-ghcr.sh <<'CHECK'
#!/bin/bash
# Script para verificar status do GHCR

echo "🔍 Verificando autenticação Docker..."
docker login ghcr.io --get-login 2>/dev/null && echo "✅ Autenticado" || echo "❌ Não autenticado"

echo ""
echo "🔍 Testando pull da imagem..."
docker pull ghcr.io/diogenesmendes01/front-boletos-gatway:latest && echo "✅ Pull bem-sucedido" || echo "❌ Pull falhou"

echo ""
echo "🔍 Listando imagens locais..."
docker images | grep front-boletos
CHECK

chmod +x check-ghcr.sh

echo -e "\n${BLUE}Script de verificação criado: check-ghcr.sh${NC}"
echo "Execute na VPS para verificar o status:"
echo "scp -P ${VPS_PORT} check-ghcr.sh ${VPS_HOST}:/tmp/"
echo "ssh -p ${VPS_PORT} ${VPS_HOST} 'bash /tmp/check-ghcr.sh'"

echo -e "\n${GREEN}🎯 Próximos passos:${NC}"
echo "1. Execute o deploy novamente:"
echo "   git push origin main"
echo "2. Ou faça deploy manual:"
echo "   ./deploy-manual.sh"