#!/bin/bash

# Script para monitorar logs da aplicação em tempo real
# Uso: ./scripts/monitor-logs.sh

echo "🔍 Monitorando logs da aplicação..."
echo "=================================="

# Função para mostrar logs do Vite
show_vite_logs() {
    echo "📱 Logs do Vite Preview:"
    echo "------------------------"
    ps aux | grep "vite preview" | grep -v grep | while read line; do
        echo "PID: $(echo $line | awk '{print $2}')"
        echo "Status: $(echo $line | awk '{print $8}')"
    done
    echo ""
}

# Função para mostrar logs de rede
show_network_status() {
    echo "🌐 Status da Rede:"
    echo "------------------"
    echo "Porta 3000: $(lsof -i :3000 2>/dev/null | grep LISTEN | wc -l) processos ativos"
    echo "Porta 4173: $(lsof -i :4173 2>/dev/null | grep LISTEN | wc -l) processos ativos"
    echo ""
}

# Função para mostrar logs de build
show_build_status() {
    echo "🏗️ Status do Build:"
    echo "-------------------"
    if [ -d "dist" ]; then
        echo "✅ Pasta dist existe"
        echo "📁 Arquivos: $(ls -la dist/ | wc -l)"
        echo "📊 Tamanho: $(du -sh dist/ | cut -f1)"
    else
        echo "❌ Pasta dist não existe"
    fi
    echo ""
}

# Função para mostrar variáveis de ambiente
show_env_vars() {
    echo "🔧 Variáveis de Ambiente:"
    echo "-------------------------"
    echo "VITE_MOCK_MODE: ${VITE_MOCK_MODE:-'não definida'}"
    echo "VITE_API_BASE_URL: ${VITE_API_BASE_URL:-'não definida'}"
    echo "VITE_APP_ENVIRONMENT: ${VITE_APP_ENVIRONMENT:-'não definida'}"
    echo "NODE_ENV: ${NODE_ENV:-'não definida'}"
    echo ""
}

# Função para mostrar logs de erro
show_error_logs() {
    echo "🚨 Verificando erros:"
    echo "---------------------"
    
    # Verificar se há erros no console do navegador
    echo "📱 Para ver erros JavaScript:"
    echo "   1. Abra http://localhost:3000 no navegador"
    echo "   2. Pressione F12 (ou Cmd+Option+I no Mac)"
    echo "   3. Vá na aba 'Console'"
    echo "   4. Procure por erros em vermelho"
    echo ""
    
    # Verificar se há erros de build
    echo "🏗️ Para ver erros de build:"
    echo "   npm run build"
    echo ""
    
    # Verificar se há erros de linting
    echo "🔍 Para ver erros de linting:"
    echo "   npm run lint"
    echo ""
}

# Executar todas as verificações
show_vite_logs
show_network_status
show_build_status
show_env_vars
show_error_logs

echo "💡 Dica: Os erros mais importantes aparecem no console do navegador!"
echo "   Acesse: http://localhost:3000 e abra o DevTools (F12)"
