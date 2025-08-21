# 🚀 Deploy Guide - Importador de Boletos OlympiaBank

## 📋 Resumo

Deploy automático configurado com GitHub Actions para o projeto React + Vite.

- **Site em produção:** https://olympiabank.xyz
- **API Backend:** https://api.envio-boleto.olympiabank.xyz
- **Servidor VPS:** 168.231.92.229

## 🔧 Configuração Inicial

### 1. GitHub Secrets Necessários

Configure no repositório: `Settings → Secrets and variables → Actions`

```
VPS_USERNAME=olympia
VPS_SSH_KEY=[chave SSH privada fornecida pela infra]
```

### 2. Estrutura de Deploy

```
.github/workflows/deploy.yml  # Workflow do GitHub Actions
Dockerfile                   # Imagem Docker para produção
nginx.conf                   # Configuração do servidor web
docker-compose.yml           # Orquestração de containers
```

## 🚀 Deploy Automático

### Trigger do Deploy

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

**O que acontece:**
1. ✅ Testes e lint
2. 🏗️ Build da aplicação
3. 🐳 Build da imagem Docker
4. 📤 Push para GitHub Container Registry
5. 🖥️ Deploy automático na VPS
6. ✅ Site atualizado em ~5 minutos

### Acompanhar o Deploy

1. **GitHub:** `Actions` tab → ver progress em tempo real
2. **Logs:** Click no job para ver detalhes
3. **Site:** https://olympiabank.xyz (aguardar alguns minutos)

## 🛠️ Deploy Manual

### Usando Docker

```bash
# Build local
npm run docker:build

# Executar localmente
npm run docker:run

# Acesse: http://localhost:3000
```

### Usando Docker Compose

```bash
# Desenvolvimento
npm run docker:dev

# Produção
npm run docker:prod
```

### Script de Deploy

```bash
# Deploy completo
npm run deploy

# Ou diretamente
./scripts/deploy.sh production
```

## 🔍 Debugging

### Ver logs do container

```bash
# Via SSH na VPS
ssh olympia@168.231.92.229
cd /home/olympia/frontend-boletos
docker-compose logs -f
```

### Verificar status

```bash
# Status dos containers
docker-compose ps

# Health check
curl http://localhost:3000/health
```

### Problemas Comuns

#### ❌ Build falha no GitHub
- Verificar `npm run build` funciona localmente
- Ver logs completos na aba Actions

#### ❌ Deploy falha na VPS
- Verificar se secrets estão configurados
- SSH na VPS e verificar docker-compose

#### ❌ Site não carrega
- Aguardar 2-3 minutos após deploy
- Limpar cache do navegador (Ctrl+F5)
- Verificar logs: `docker-compose logs frontend`

#### ❌ API não conecta
- Verificar se `VITE_API_BASE_URL` está correto
- Testar API direto: https://api.envio-boleto.olympiabank.xyz
- Ver configuração nginx.conf

## 🌍 Ambientes

### Desenvolvimento Local
```bash
npm run dev
# http://localhost:5173
# Mock mode ativo
```

### Docker Local
```bash
npm run docker:dev
# http://localhost:5173
# Ambiente isolado
```

### Staging (Branch develop)
- Automático no push para `develop`
- URL: https://staging.olympiabank.xyz

### Produção (Branch main)
- Automático no push para `main`
- URL: https://olympiabank.xyz

## 📊 Monitoramento

### Health Checks
- **Container:** http://localhost:3000/health
- **Aplicação:** https://olympiabank.xyz/health

### Logs
```bash
# Logs da aplicação
docker-compose logs frontend

# Logs do nginx
docker exec -it olympiabank-frontend tail -f /var/log/nginx/access.log
```

### Métricas
- **Docker stats:** `docker stats olympiabank-frontend`
- **Disk usage:** `docker system df`

## 🔒 Segurança

### Headers de Segurança
Configurados no nginx.conf:
- X-Frame-Options
- X-XSS-Protection  
- X-Content-Type-Options
- Content-Security-Policy

### Container Security
- Non-root user (nginx-user)
- Alpine Linux (menor superfície de ataque)
- Secrets via environment variables

## 🚨 Rollback

### Rollback Rápido
```bash
# Via SSH na VPS
cd /home/olympia/frontend-boletos
docker-compose pull olympiabank-frontend:TAG-ANTERIOR
docker-compose up -d
```

### Tags Disponíveis
- `latest` - última versão
- `YYYYMMDD-HHMMSS` - timestamp do build
- `main-COMMIT-SHA` - por commit

## 📞 Suporte

### Problemas de Infraestrutura
- VPS/Docker: Contatar administrador da VPS
- DNS/Domínio: Contatar responsável pelo domínio

### Problemas de Aplicação
- Build/Deploy: Verificar logs no GitHub Actions
- Runtime: Verificar logs do container

### Contatos
- **Infra:** [Responsável VPS]
- **Dev:** Equipe de desenvolvimento
- **Emergência:** [Contato emergencial]

---

## ✅ Checklist de Deploy

### Primeira vez:
- [ ] Secrets configurados no GitHub
- [ ] VPS acessível via SSH
- [ ] Docker instalado na VPS
- [ ] Diretório `/home/olympia/frontend-boletos` criado
- [ ] `docker-compose.yml` na VPS

### A cada deploy:
- [ ] Testes passando localmente
- [ ] `npm run build` funciona
- [ ] Commit com mensagem descritiva
- [ ] Push para branch `main`
- [ ] Acompanhar GitHub Actions
- [ ] Verificar site funcionando

**🎉 Deploy configurado e funcionando!**