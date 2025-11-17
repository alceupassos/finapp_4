# Deploy do Finapp Dashboard

## 🚀 Como fazer deploy no VPS

### 1️⃣ Primeira vez (Configuração inicial)

1. **Configure as credenciais do VPS:**
   ```bash
   # Edite o arquivo deploy.sh e altere estas variáveis (linhas 10-15):
   VPS_USER="seu_usuario"      # Usuário SSH
   VPS_HOST="seu_ip_ou_dominio" # IP ou domínio do VPS
   VPS_PORT="22"                # Porta SSH (padrão 22)
   VPS_PATH="/var/www/finapp"   # Onde ficará o app no servidor
   APP_DOMAIN="seu_dominio.com" # Seu domínio (opcional)
   ```

2. **Prepare o VPS (primeira vez):**
   ```bash
   # Conecte ao VPS e instale Nginx (se ainda não tiver)
   ssh root@seu_ip
   sudo apt update
   sudo apt install nginx -y
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

3. **Execute o deploy:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### 2️⃣ Deploys subsequentes (Rápido)

Após o primeiro deploy, use o script rápido:

```bash
# Criar arquivo de configuração (primeira vez)
cp .deploy-config.example .deploy-config
# Edite .deploy-config com suas informações

# Deploy rápido
chmod +x deploy-quick.sh
./deploy-quick.sh
```

### 3️⃣ Configurar SSL/HTTPS (Recomendado)

Após o primeiro deploy, configure SSL com Let's Encrypt:

```bash
# No VPS
ssh root@seu_ip
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu_dominio.com
sudo systemctl reload nginx
```

Renovação automática:
```bash
# Testar renovação
sudo certbot renew --dry-run

# Certbot já configura renovação automática via cron
```

## 📁 O que o script faz

1. ✅ Faz build local da aplicação
2. ✅ Cria backup da versão anterior no VPS
3. ✅ Envia arquivos via rsync (rápido e incremental)
4. ✅ Configura Nginx automaticamente
5. ✅ Aplica permissões corretas
6. ✅ Reinicia Nginx
7. ✅ Verifica se está tudo funcionando

## 🔧 Estrutura no VPS

```
/var/www/finapp/
├── current/              # Versão atual
│   ├── index.html
│   ├── assets/
│   └── .env
├── backup_20241117_143022/  # Backups automáticos
└── backup_20241116_102015/
```

## 📊 Monitoramento

Ver logs em tempo real:
```bash
# Access logs
ssh root@seu_ip 'sudo tail -f /var/log/nginx/finapp-access.log'

# Error logs
ssh root@seu_ip 'sudo tail -f /var/log/nginx/finapp-error.log'

# Status do Nginx
ssh root@seu_ip 'sudo systemctl status nginx'
```

## 🆘 Troubleshooting

### Erro de permissão SSH
```bash
# Verificar se sua chave SSH está configurada
ssh-copy-id root@seu_ip
```

### Nginx não inicia
```bash
# Verificar configuração
ssh root@seu_ip 'sudo nginx -t'

# Ver logs de erro
ssh root@seu_ip 'sudo tail -100 /var/log/nginx/error.log'
```

### Aplicação mostra erro 404
```bash
# Verificar se arquivos foram enviados
ssh root@seu_ip 'ls -la /var/www/finapp/current'

# Verificar permissões
ssh root@seu_ip 'sudo chown -R www-data:www-data /var/www/finapp/current'
```

### Rollback para versão anterior
```bash
ssh root@seu_ip
cd /var/www/finapp
rm -rf current
mv backup_YYYYMMDD_HHMMSS current  # Use timestamp do backup
sudo systemctl reload nginx
```

## 🔐 Segurança

### Firewall básico (recomendado)
```bash
ssh root@seu_ip
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Proteger variáveis de ambiente
- Nunca commite `.env.production` no Git
- Use secrets do GitHub Actions se usar CI/CD
- Mantenha backups seguros das variáveis

## 📦 GitHub Actions (Opcional)

Para deploy automático via GitHub Actions, crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main, restore-frontend]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy to VPS
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.VPS_HOST }}
          REMOTE_USER: ${{ secrets.VPS_USER }}
          SOURCE: "dist/"
          TARGET: "/var/www/finapp/current"
```

Adicione secrets no GitHub:
- `SSH_PRIVATE_KEY`: Sua chave SSH privada
- `VPS_HOST`: IP do VPS
- `VPS_USER`: Usuário SSH

## 📝 Checklist de Deploy

- [ ] Build local funcionando (`npm run build`)
- [ ] Variáveis de ambiente configuradas (`.env.production`)
- [ ] VPS com Nginx instalado e rodando
- [ ] Credenciais SSH configuradas
- [ ] Script deploy.sh com informações corretas
- [ ] Firewall configurado (portas 80, 443, 22)
- [ ] SSL configurado (certbot)
- [ ] Monitoramento de logs configurado
- [ ] Backup da versão anterior criado

## 🎯 Próximos passos após deploy

1. ✅ Testar aplicação no navegador
2. ✅ Configurar domínio (se aplicável)
3. ✅ Configurar SSL/HTTPS
4. ✅ Configurar monitoramento (UptimeRobot, etc.)
5. ✅ Configurar backup automático
6. ✅ Documentar credenciais em local seguro
