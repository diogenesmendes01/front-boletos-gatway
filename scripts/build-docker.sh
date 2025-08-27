#!/bin/bash

# Script para build Docker robusto
set -e

echo "🐳 Iniciando build Docker..."

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker e tente novamente."
    exit 1
fi

# Limpar builds anteriores
echo "🧹 Limpando builds anteriores..."
docker system prune -f

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Verificar se o build funciona localmente
echo "🔨 Testando build local..."
npm run build

# Build da imagem Docker
echo "🏗️ Construindo imagem Docker..."
docker build -t boletos-frontend:latest .

# Verificar se a imagem foi criada
if docker images | grep -q "boletos-frontend"; then
    echo "✅ Build Docker concluído com sucesso!"
    echo "📊 Informações da imagem:"
    docker images boletos-frontend:latest
else
    echo "❌ Falha no build Docker"
    exit 1
fi

echo "🚀 Imagem pronta para deploy!"
echo "💡 Para testar localmente: docker run -p 8080:80 boletos-frontend:latest"
