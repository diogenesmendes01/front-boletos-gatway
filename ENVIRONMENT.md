# Configurações de Ambiente

Este documento explica como configurar as variáveis de ambiente para o **Importador de Boletos OlympiaBank**.

## 📁 Arquivos de Configuração

### `.env.development`
Configurações para ambiente de desenvolvimento local com APIs mockadas.

### `.env.production`
Configurações para ambiente de produção com API real.

### `.env.local`
Configurações específicas do desenvolvedor (não versionado).

### `.env.example`
Template com todas as variáveis disponíveis.

## 🚀 Como Configurar

### 1. Desenvolvimento Local (com Mocks)
```bash
# Copiar arquivo de desenvolvimento
cp .env.development .env.local

# Ou criar manualmente
echo "VITE_MOCK_MODE=true" > .env.local
```

### 2. Desenvolvimento com API Real
```bash
# Copiar template
cp .env.example .env.local

# Editar variáveis
VITE_API_BASE_URL=https://api.envio-boleto.olympiabank.xyz
VITE_MOCK_MODE=false
```

### 3. Produção
As variáveis são configuradas no CI/CD ou servidor de deploy.

## ⚙️ Variáveis Disponíveis

### 🌐 API Configuration
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_API_BASE_URL` | `https://api.envio-boleto.olympiabank.xyz` | URL base da API |
| `VITE_API_TIMEOUT` | `30000` | Timeout em ms |
| `VITE_API_RETRY_ATTEMPTS` | `3` | Tentativas de retry |
| `VITE_API_RETRY_DELAY` | `1000` | Delay entre retries |

### 🚀 App Configuration
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_APP_NAME` | `Importador de Boletos` | Nome da aplicação |
| `VITE_APP_VERSION` | `1.0.0` | Versão da aplicação |
| `VITE_APP_ENVIRONMENT` | `development` | Ambiente atual |
| `VITE_MOCK_MODE` | `false` | Ativar mocks (true/false) |
| `VITE_DEBUG_MODE` | `false` | Modo debug (true/false) |
| `VITE_LOG_LEVEL` | `info` | Nível de log (debug/info/warn/error) |

### 📁 Upload Configuration
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_MAX_FILE_SIZE` | `10485760` | Tamanho máximo arquivo (bytes) |
| `VITE_MAX_ROWS` | `2000` | Máximo de linhas por arquivo |

### 🔄 Polling Configuration
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_POLLING_INTERVAL` | `2000` | Intervalo de polling (ms) |
| `VITE_SSE_RECONNECT_DELAY` | `5000` | Delay para reconexão SSE (ms) |

### 🎛️ Feature Flags
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_ENABLE_SSE` | `true` | Ativar Server-Sent Events |
| `VITE_ENABLE_RETRY` | `true` | Ativar retry automático |
| `VITE_ENABLE_CACHE` | `true` | Ativar cache de status |

### 🔒 Security Configuration
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_ENABLE_CSP` | `false` | Content Security Policy |
| `VITE_ENABLE_HSTS` | `false` | HTTP Strict Transport Security |

### 🔗 Defaults
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_DEFAULT_WEBHOOK_URL` | - | URL padrão para webhook |

## 🛠️ Comandos NPM

```bash
# Desenvolvimento (usa .env.development automaticamente)
npm run dev

# Build de produção (usa .env.production automaticamente)
npm run build

# Build de desenvolvimento
npm run build:dev

# Verificar configurações
npm run config:check
```

## 🐛 Debug de Configurações

Em modo desenvolvimento, as configurações são exibidas no console:

```javascript
// Abrir DevTools Console
🔧 Configurações da Aplicação
  Environment: development
  Mock Mode: true
  API Base URL: http://localhost:3000
  Debug Mode: true
  Log Level: debug
```

## 📝 Exemplos de Configuração

### Desenvolvimento Local
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_MOCK_MODE=true
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

### Staging
```env
VITE_API_BASE_URL=https://staging-api.envio-boleto.olympiabank.xyz
VITE_MOCK_MODE=false
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=info
```

### Produção
```env
VITE_API_BASE_URL=https://api.envio-boleto.olympiabank.xyz
VITE_MOCK_MODE=false
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
```

## ⚠️ Observações Importantes

1. **Prefixo VITE_**: Todas as variáveis devem começar com `VITE_` para serem expostas no frontend.

2. **Segurança**: Nunca exponha chaves secretas em variáveis `VITE_*` pois elas são públicas no bundle.

3. **Ordem de Prioridade**:
   - `.env.local` (nunca versionado)
   - `.env.development` / `.env.production`
   - `.env.example`

4. **Validação**: O sistema valida automaticamente as configurações no carregamento.

## 🆘 Troubleshooting

### Problema: Variáveis não carregam
- Verificar se começam com `VITE_`
- Reiniciar o servidor de desenvolvimento
- Verificar sintaxe do arquivo .env

### Problema: Mock não funciona
```env
# Verificar se está habilitado
VITE_MOCK_MODE=true
```

### Problema: API timeout
```env
# Aumentar timeout
VITE_API_TIMEOUT=60000
```