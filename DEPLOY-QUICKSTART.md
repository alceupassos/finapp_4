# 🚀 Scripts de Deploy - Guia Rápido

## 📁 Arquivos Criados

- **`deploy-setup.sh`** - Script interativo completo (RECOMENDADO para primeira vez)
- **`deploy.sh`** - Script completo com configuração manual
- **`deploy-quick.sh`** - Deploy rápido (após primeira configuração)
- **`DEPLOY.md`** - Documentação completa
- **`.deploy-config.example`** - Exemplo de configuração

## 🎯 Primeira Vez - 3 Passos

### Opção 1: Script Interativo (FÁCIL) ⭐
```bash
./deploy-setup.sh
```
O script irá:
- ✅ Pedir informações do VPS
- ✅ Testar conexão SSH
- ✅ Instalar Nginx (se necessário)
- ✅ Fazer build e deploy automático
- ✅ Salvar configurações para próximos deploys

### Opção 2: Manual
```bash
# 1. Editar configurações no deploy.sh (linhas 10-15)
nano deploy.sh

# 2. Executar deploy
./deploy.sh
```

## ⚡ Deploys Rápidos (após primeira vez)

```bash
./deploy-quick.sh
```

## 📋 Comandos Úteis

### Ver status do site
```bash
curl http://SEU_IP
```

### Ver logs em tempo real
```bash
ssh root@SEU_IP 'sudo tail -f /var/log/nginx/finapp-access.log'
```

### Verificar Nginx
```bash
ssh root@SEU_IP 'sudo systemctl status nginx'
```

### Rollback (voltar versão anterior)
```bash
ssh root@SEU_IP
cd /var/www/finapp
ls -l  # Ver backups disponíveis
rm -rf current
mv backup_20241117_143022 current  # Usar timestamp do backup
sudo systemctl reload nginx
```

## 🔐 Configurar SSL (HTTPS)

Após primeiro deploy:
```bash
ssh root@SEU_IP
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu_dominio.com
```

Renovação automática (testar):
```bash
sudo certbot renew --dry-run
```

## 🐛 Troubleshooting

### Erro de conexão SSH
```bash
# Copiar sua chave SSH para o VPS
ssh-copy-id root@SEU_IP

# Ou especificar porta diferente
ssh-copy-id -p 2222 root@SEU_IP
```

### Nginx não reinicia
```bash
ssh root@SEU_IP
sudo nginx -t  # Testar configuração
sudo tail -50 /var/log/nginx/error.log  # Ver erros
```

### Aplicação não carrega
```bash
ssh root@SEU_IP
ls -la /var/www/finapp/current  # Verificar arquivos
sudo chown -R www-data:www-data /var/www/finapp/current  # Ajustar permissões
```

## 📊 Estrutura no VPS

```
/var/www/finapp/
├── current/                    # ← Versão ativa
│   ├── index.html
│   ├── assets/
│   │   ├── index-*.js
│   │   └── index-*.css
│   └── .env
├── backup_20241117_143022/    # ← Backup automático
└── backup_20241116_102015/    # ← Backup anterior
```

## 🔄 Workflow Recomendado

### Desenvolvimento
```bash
npm run dev  # Testar localmente
```

### Staging/Produção
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin restore-frontend
./deploy-quick.sh  # Deploy automático
```

## 🎨 Customizações

### Mudar porta do Nginx (ex: 8080)
Edite `/etc/nginx/sites-available/finapp` no VPS:
```nginx
listen 8080;
```

### Adicionar múltiplos domínios
```nginx
server_name dominio1.com dominio2.com;
```

### Configurar proxy para API
```nginx
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

## 📱 Deploy Automático com GitHub Actions

Crie `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main, restore-frontend]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - name: Deploy
        run: |
          ./deploy-quick.sh
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
```

## 💾 Backup Manual

```bash
# Criar backup completo
ssh root@SEU_IP
tar -czf ~/finapp-backup-$(date +%Y%m%d).tar.gz /var/www/finapp/current

# Download do backup
scp root@SEU_IP:~/finapp-backup-*.tar.gz ./
```

## 📈 Monitoramento

### Configurar UptimeRobot
1. Acesse https://uptimerobot.com
2. Adicione monitor HTTP(s)
3. URL: http://seu_ip ou https://seu_dominio.com
4. Intervalo: 5 minutos

### Logs de acesso
```bash
# Top 10 IPs
ssh root@SEU_IP "sudo awk '{print \$1}' /var/log/nginx/finapp-access.log | sort | uniq -c | sort -rn | head -10"

# Total de requests hoje
ssh root@SEU_IP "sudo grep $(date +%d/%b/%Y) /var/log/nginx/finapp-access.log | wc -l"
```

## 🆘 Suporte

Leia a documentação completa: `DEPLOY.md`

Ou abra uma issue no GitHub.
