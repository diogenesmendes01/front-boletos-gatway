# Guia de Deploy para VPS - Front-end Boletos Gateway

## Visão Geral
Este projeto é uma aplicação React + Vite com Material UI que serve como front-end para o sistema de importação de boletos do Olympia Bank.

## Métodos de Deploy Disponíveis

### 1. Deploy com Docker (Recomendado)
Usa Docker e Docker Compose para containerizar e executar a aplicação.

**Vantagens:**
- Isolamento completo do ambiente
- Fácil rollback
- Configuração simplificada
- Consistência entre ambientes

**Comando:**
```bash
./deploy-vps.sh docker usuario@seu-ip-vps
```

### 2. Deploy com PM2 + Nginx
Usa PM2 para gerenciar o processo Node.js e Nginx como proxy reverso.

**Vantagens:**
- Menor uso de recursos
- Controle mais granular
- Auto-restart com PM2
- Load balancing nativo

**Comando:**
```bash
./deploy-vps.sh pm2 usuario@seu-ip-vps
```

## Pré-requisitos na VPS

### Para Deploy Docker:
- Ubuntu 20.04+ ou Debian 10+
- Mínimo 1GB RAM
- 10GB espaço em disco
- Porta 80 e 3000 liberadas

### Para Deploy PM2:
- Ubuntu 20.04+ ou Debian 10+
- Node.js 18+
- Nginx
- PM2
- Mínimo 512MB RAM

## Configuração Passo a Passo

### 1. Preparar VPS
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar ferramentas básicas
sudo apt install -y curl git wget build-essential

# Configurar firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw enable
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```bash
cp .env.example .env
```

Edite as variáveis conforme necessário:
```env
VITE_API_BASE_URL=https://api.envio-boleto.olympiabank.xyz
VITE_MOCK_MODE=false
VITE_APP_ENVIRONMENT=production
PORT=3000
```

### 3. Executar Deploy

#### Opção A: Docker
```bash
# Dar permissão de execução
chmod +x deploy-vps.sh

# Executar deploy
./deploy-vps.sh docker usuario@ip-da-vps
```

#### Opção B: PM2 + Nginx
```bash
# Dar permissão de execução
chmod +x deploy-vps.sh

# Executar deploy
./deploy-vps.sh pm2 usuario@ip-da-vps
```

## Estrutura de Diretórios na VPS

```
/opt/apps/front-boletos-gateway/
├── dist/                 # Build da aplicação
├── docker-compose.yml    # Config Docker
├── ecosystem.config.js   # Config PM2
├── nginx.conf           # Config Nginx
├── server.js            # Servidor Express (PM2)
└── logs/                # Logs da aplicação
```

## Comandos Úteis

### Docker
```bash
# Ver logs
ssh usuario@vps "cd /opt/apps/front-boletos-gateway && docker-compose logs -f"

# Reiniciar
ssh usuario@vps "cd /opt/apps/front-boletos-gateway && docker-compose restart"

# Parar
ssh usuario@vps "cd /opt/apps/front-boletos-gateway && docker-compose down"

# Ver status
ssh usuario@vps "docker ps"
```

### PM2
```bash
# Ver logs
ssh usuario@vps "pm2 logs front-boletos-gateway"

# Reiniciar
ssh usuario@vps "pm2 restart front-boletos-gateway"

# Ver status
ssh usuario@vps "pm2 status"

# Monitorar
ssh usuario@vps "pm2 monit"
```

### Nginx
```bash
# Testar configuração
ssh usuario@vps "sudo nginx -t"

# Recarregar
ssh usuario@vps "sudo systemctl reload nginx"

# Ver logs
ssh usuario@vps "sudo tail -f /var/log/nginx/access.log"
```

## SSL/HTTPS com Certbot

Para adicionar HTTPS com Let's Encrypt:

```bash
# Instalar Certbot
ssh usuario@vps "sudo apt install certbot python3-certbot-nginx"

# Obter certificado
ssh usuario@vps "sudo certbot --nginx -d seu-dominio.com"

# Renovação automática
ssh usuario@vps "sudo certbot renew --dry-run"
```

## Monitoramento

### Health Check
A aplicação expõe endpoint de saúde em:
```
http://seu-ip:3000/health
```

### Logs em Tempo Real
```bash
# Docker
docker-compose logs -f frontend

# PM2
pm2 logs front-boletos-gateway --lines 100
```

## Rollback

Em caso de problemas, use o script de rollback:

```bash
./rollback-vps.sh usuario@ip-da-vps tag-anterior
```

## CI/CD com GitHub Actions

Para automatizar o deploy, adicione este workflow:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/apps/front-boletos-gateway
            git pull origin main
            docker-compose build
            docker-compose up -d
```

## Troubleshooting

### Porta já em uso
```bash
# Verificar processo usando a porta
sudo lsof -i :3000

# Matar processo
sudo kill -9 <PID>
```

### Erro de permissão Docker
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Relogar
exit
ssh usuario@vps
```

### Build falhando
```bash
# Limpar cache npm
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Nginx 502 Bad Gateway
```bash
# Verificar se aplicação está rodando
pm2 status

# Verificar logs
pm2 logs --err

# Reiniciar
pm2 restart all
```

## Performance e Otimização

### Nginx Caching
Adicione cache no nginx.conf:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Compression
Habilite gzip no nginx.conf:
```nginx
gzip on;
gzip_types text/plain application/json application/javascript text/css;
gzip_min_length 1000;
```

### CDN
Configure CloudFlare ou outro CDN apontando para seu domínio.

## Segurança

### Firewall
```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### Fail2ban
```bash
# Instalar
sudo apt install fail2ban

# Configurar
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Headers de Segurança
Adicione no nginx.conf:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Backup

Script de backup automático:
```bash
#!/bin/bash
BACKUP_DIR="/backup/front-boletos"
DATE=$(date +%Y%m%d-%H%M%S)

# Backup dos arquivos
tar -czf $BACKUP_DIR/app-$DATE.tar.gz /opt/apps/front-boletos-gateway

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "app-*.tar.gz" -mtime +7 -delete
```

## Suporte

Para problemas ou dúvidas:
- Logs: `/opt/apps/front-boletos-gateway/logs/`
- Documentação: Este arquivo
- Issues: GitHub do projeto