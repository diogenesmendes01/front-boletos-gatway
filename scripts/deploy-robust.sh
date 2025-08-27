#!/bin/bash

# Script de Deploy Robusto - Resolve Problemas do Rollup
set -e

echo "🚀 Iniciando deploy robusto..."

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

# Tentar build com Dockerfile principal
echo "🏗️ Tentando build com Dockerfile principal..."
if docker build -t boletos-frontend:latest .; then
    echo "✅ Build com Dockerfile principal concluído!"
else
    echo "⚠️ Dockerfile principal falhou, tentando alternativa..."
    
    # Tentar com Dockerfile alternativo
    if docker build -f Dockerfile.alternative -t boletos-frontend:latest .; then
        echo "✅ Build com Dockerfile alternativo concluído!"
    else
        echo "❌ Ambos os Dockerfiles falharam!"
        echo "🔍 Verificando logs..."
        
        # Tentar build com mais detalhes
        docker build -f Dockerfile.alternative -t boletos-frontend:debug . 2>&1 | tee build-debug.log
        
        echo "📋 Logs salvos em build-debug.log"
        exit 1
    fi
fi

# Verificar se a imagem foi criada
if docker images | grep -q "boletos-frontend"; then
    echo "✅ Build Docker concluído com sucesso!"
    echo "📊 Informações da imagem:"
    docker images boletos-frontend:latest
    
    # Testar a imagem
    echo "🧪 Testando imagem..."
    docker run --rm -d --name test-container -p 8080:80 boletos-frontend:latest
    
    sleep 5
    
    if curl -s http://localhost:8080 > /dev/null; then
        echo "✅ Imagem funcionando corretamente!"
        docker stop test-container
    else
        echo "⚠️ Imagem pode ter problemas"
        docker stop test-container
    fi
else
    echo "❌ Falha no build Docker"
    exit 1
fi

echo "🚀 Imagem pronta para deploy!"
echo "💡 Para testar localmente: docker run -p 8080:80 boletos-frontend:latest"
