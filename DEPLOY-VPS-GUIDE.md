# 🚀 Guia Completo de Deploy VPS - Front Boletos Gateway

## 📋 Visão Geral

Este projeto utiliza **GitHub Actions** para CI/CD automático, fazendo build e deploy de uma aplicação React/Vite containerizada com Docker para uma VPS.

### Fluxo de Deploy
1. **Push para branch main** → GitHub Actions é acionado
2. **Build da imagem Docker** → Enviada para GitHub Container Registry
3. **Deploy automático na VPS** → Container é atualizado via SSH

## 🔧 Configuração Inicial (Execute UMA VEZ)

### Passo 1: Preparar a VPS
Execute o script de setup para configurar sua VPS:

```bash
# Dar permissão de execução
chmod +x setup-vps.sh

# Executar setup (localmente)
./setup-vps.sh
```

Este script irá:
- ✅ Instalar Docker e Docker Compose
- ✅ Criar estrutura de diretórios
- ✅ Configurar firewall
- ✅ Criar scripts auxiliares
- ✅ Configurar Nginx (opcional)

### Passo 2: Configurar Secrets no GitHub

Acesse: **Settings** → **Secrets and variables** → **Actions**

Adicione os seguintes secrets:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `VPS_HOST` | IP da sua VPS | `192.168.1.100` |
| `VPS_USER` | Usuário SSH | `ubuntu` |
| `VPS_SSH_KEY` | Chave privada SSH | Conteúdo completo da chave |
| `VPS_PORT` | Porta SSH (opcional) | `22` |

#### Como gerar chave SSH:
```bash
# Gerar par de chaves (se não tiver)
ssh-keygen -t ed25519 -C "github-actions"

# Copiar chave pública para VPS
ssh-copy-id -p 22 usuario@ip-da-vps

# Copiar conteúdo da chave privada para o GitHub Secret
cat ~/.ssh/id_ed25519
```

### Passo 3: Configurar Variables no GitHub (Opcional)

Acesse: **Settings** → **Secrets and variables** → **Actions** → **Variables**

| Variable | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `VITE_API_BASE_URL` | URL da API | `https://api.envio-boleto.olympiabank.xyz` |
| `VITE_MOCK_MODE` | Modo mock | `false` |
| `VITE_APP_ENVIRONMENT` | Ambiente | `production` |

## 🚀 Deploy Automático

### Via GitHub Actions (Recomendado)

O deploy acontece automaticamente ao fazer push na branch `main`:

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

### Executar Workflow Manualmente

1. Acesse: **Actions** → **Deploy React Frontend**
2. Clique em **Run workflow**
3. Selecione a branch e clique **Run**

## 🔄 Deploy Manual

Use o script de deploy manual quando necessário:

```bash
# Dar permissão
chmod +x deploy-manual.sh

# Executar menu interativo
./deploy-manual.sh
```

### Opções do Menu:
1. **Deploy completo** - Build local + deploy
2. **Deploy apenas** - Usa imagem existente
3. **Build local** - Apenas constrói imagem
4. **Rollback** - Volta versão anterior
5. **Ver logs** - Monitora logs em tempo real
6. **Ver status** - Mostra status da aplicação
7. **Restart** - Reinicia containers

## 📂 Estrutura na VPS

```
/opt/front-boletos-getway/
├── docker-compose.yml    # Configuração dos containers
├── .env                  # Variáveis de ambiente
├── backup.sh            # Script de backup
├── restart-app.sh       # Script de restart
├── view-logs.sh         # Script para ver logs
└── backups/             # Diretório de backups
```

## 🛠️ Comandos Úteis

### Verificar Status
```bash
ssh usuario@vps "docker ps | grep front-boletos"
```

### Ver Logs
```bash
ssh usuario@vps "cd /opt/front-boletos-getway && docker-compose logs -f"
```

### Reiniciar Aplicação
```bash
ssh usuario@vps "cd /opt/front-boletos-getway && ./restart-app.sh"
```

### Fazer Backup
```bash
ssh usuario@vps "cd /opt/front-boletos-getway && ./backup.sh"
```

### Health Check
```bash
curl http://ip-da-vps:3000/health
```

## 🔐 Configurar HTTPS (SSL)

### Com Certbot (Let's Encrypt)

```bash
# Na VPS
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### Com Cloudflare (Recomendado)

1. Adicione seu domínio no Cloudflare
2. Aponte o DNS para o IP da VPS
3. Ative o SSL/TLS em "Full"
4. Ative "Always Use HTTPS"

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
ssh usuario@vps "docker logs front-boletos-getway --tail 100"

# Verificar docker-compose
ssh usuario@vps "cd /opt/front-boletos-getway && docker-compose config"
```

### Erro de permissão

```bash
# Na VPS
sudo usermod -aG docker $USER
# Fazer logout e login novamente
```

### Porta já em uso

```bash
# Verificar processo
sudo lsof -i :3000

# Matar processo
sudo kill -9 <PID>
```

### Build falhando no GitHub Actions

1. Verifique os logs do Actions
2. Confirme que os secrets estão configurados
3. Verifique se o Dockerfile está correto

### Rollback de emergência

```bash
# Listar versões disponíveis
ssh usuario@vps "docker images ghcr.io/diogenesmendes01/front-boletos-gatway"

# Voltar para versão específica
ssh usuario@vps "cd /opt/front-boletos-getway && \
  docker-compose down && \
  docker run -d --name front-boletos-getway \
    -p 3000:80 \
    ghcr.io/diogenesmendes01/front-boletos-gatway:<TAG_ANTERIOR>"
```

## 📊 Monitoramento

### Recursos do Sistema

```bash
# CPU e Memória
ssh usuario@vps "docker stats front-boletos-getway --no-stream"

# Espaço em disco
ssh usuario@vps "df -h /opt/front-boletos-getway"
```

### Logs Estruturados

```bash
# Últimas 100 linhas
ssh usuario@vps "docker logs front-boletos-getway --tail 100"

# Logs em tempo real
ssh usuario@vps "docker logs -f front-boletos-getway"
```

## 🔄 Atualizações

### Atualizar Docker na VPS

```bash
ssh usuario@vps "sudo apt update && sudo apt upgrade docker-ce -y"
```

### Atualizar Docker Compose

```bash
ssh usuario@vps "sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
```

## 📝 Checklist de Deploy

- [ ] VPS configurada com `setup-vps.sh`
- [ ] Secrets configurados no GitHub
- [ ] Workflow testado manualmente
- [ ] Health check funcionando
- [ ] Backup configurado
- [ ] SSL/HTTPS configurado (produção)
- [ ] Monitoramento ativo

## 🆘 Suporte

### Logs importantes
- GitHub Actions: Aba "Actions" no repositório
- Container: `/opt/front-boletos-getway/logs/`
- Nginx: `/var/log/nginx/`

### Comandos de diagnóstico
```bash
# Status completo
./deploy-manual.sh
# Escolher opção 6

# Teste de conectividade
curl -I http://ip-da-vps:3000

# Verificar portas abertas
sudo netstat -tlnp
```

## 🎯 Melhores Práticas

1. **Sempre faça backup antes de deploy em produção**
2. **Teste em staging antes de produção**
3. **Monitore os logs após cada deploy**
4. **Mantenha os secrets seguros e atualizados**
5. **Documente mudanças significativas**
6. **Use tags semânticas nos commits**

## 📚 Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)