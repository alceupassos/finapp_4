# ✅ VPS Verificado - Pronto para Deploy

**Data da verificação:** 17 de novembro de 2025

## 📋 Informações do Servidor

| Item | Valor |
|------|-------|
| 🌐 **IP** | `147.93.183.55` |
| 👤 **Usuário** | `root` |
| 🔐 **SSH** | ✅ Chave configurada |
| 🔑 **Porta SSH** | `22` |

## 💻 Sistema Operacional

| Especificação | Detalhes |
|---------------|----------|
| **OS** | Ubuntu 22.04.5 LTS (Jammy) |
| **Kernel** | Linux 5.15.0-161-generic |
| **Arquitetura** | x86_64 |
| **RAM Total** | 11 GB |
| **RAM Livre** | 8.9 GB |
| **Disco Total** | 194 GB |
| **Disco Usado** | 62 GB (32%) |
| **Disco Livre** | 132 GB |

## 🌐 Nginx

| Item | Status |
|------|--------|
| **Versão** | nginx/1.18.0 (Ubuntu) |
| **Status** | ✅ Ativo e rodando |
| **Porta 80 (HTTP)** | ✅ Ativa |
| **Porta 443 (HTTPS)** | ✅ Ativa |

### Sites Configurados no Servidor

- `api-integracao.ifin.app.br`
- `evo.angrax.com.br`
- `ia.ifin.app.br`
- `ifin.app.br` / `www.ifin.app.br`
- `ifinancechat.angrax.com.br`
- `www.ifin.com.br` / `ifin.com.br`
- **`finapp`** (default server) ⭐

## 📁 Estrutura Atual do Finapp

```
/var/www/finapp/
├── index.html          ✅
├── assets/             ✅
├── dados/              ✅
└── finapp-logo.png     ✅
```

### Configuração Nginx

**Arquivo:** `/etc/nginx/sites-available/finapp`

```nginx
server {
    listen 80 default_server;
    server_name _;
    root /var/www/finapp;
    index index.html;
    location / {
        try_files $uri /index.html;
    }
}
```

**Link ativo:** `/etc/nginx/sites-enabled/000-finapp` → `/etc/nginx/sites-available/finapp`

## ✅ Verificação Local (Ambiente de Desenvolvimento)

| Item | Status |
|------|--------|
| **Node.js** | ✅ v24.7.0 |
| **npm** | ✅ v11.5.2 |
| **Dependencies** | ✅ Instaladas |
| **Build Test** | ✅ OK (2.1M) |
| **.env.production** | ✅ Configurado com Supabase |
| **SSH Connection** | ✅ Testada e funcionando |
| **.deploy-config** | ✅ Criado |

## 🚀 Como Fazer Deploy

### Opção 1: Deploy Rápido (Recomendado)

```bash
./deploy-quick.sh
```

Este script irá:
1. Fazer build local
2. Enviar arquivos via rsync
3. Recarregar Nginx
4. Concluir em ~30 segundos

### Opção 2: Deploy Interativo Completo

```bash
./deploy-setup.sh
```

Este script irá:
1. Verificar todas as configurações
2. Criar backup automático da versão anterior
3. Fazer build e upload
4. Configurar Nginx (se necessário)
5. Ajustar permissões
6. Reiniciar Nginx

### Opção 3: Verificar antes de fazer deploy

```bash
./check-deploy.sh
```

## 📱 Acesso à Aplicação

Após o deploy, a aplicação estará disponível em:

- **HTTP:** http://147.93.183.55
- **Como default server:** Qualquer domínio apontado para o IP

## 🔒 Próximos Passos Recomendados

### 1. Configurar Domínio Próprio

Edite `/etc/nginx/sites-available/finapp` no VPS:

```nginx
server {
    listen 80;
    server_name seu_dominio.com www.seu_dominio.com;
    root /var/www/finapp;
    index index.html;
    location / {
        try_files $uri /index.html;
    }
}
```

### 2. Configurar SSL/HTTPS (Recomendado)

```bash
ssh root@147.93.183.55
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu_dominio.com -d www.seu_dominio.com
```

### 3. Configurar Backup Automático

```bash
ssh root@147.93.183.55
crontab -e
# Adicionar:
0 2 * * * tar -czf /root/backups/finapp-$(date +\%Y\%m\%d).tar.gz /var/www/finapp
```

## 📊 Monitoramento

### Ver logs em tempo real

```bash
# Access logs
ssh root@147.93.183.55 'tail -f /var/log/nginx/access.log'

# Error logs
ssh root@147.93.183.55 'tail -f /var/log/nginx/error.log'
```

### Verificar status do Nginx

```bash
ssh root@147.93.183.55 'systemctl status nginx'
```

### Ver processos ativos

```bash
ssh root@147.93.183.55 'ps aux | grep nginx'
```

## 🐛 Troubleshooting

### Aplicação não carrega

```bash
# Verificar arquivos
ssh root@147.93.183.55 'ls -la /var/www/finapp'

# Ajustar permissões
ssh root@147.93.183.55 'chown -R www-data:www-data /var/www/finapp'
```

### Nginx não responde

```bash
# Testar configuração
ssh root@147.93.183.55 'nginx -t'

# Reiniciar
ssh root@147.93.183.55 'systemctl restart nginx'
```

### Rollback para versão anterior

```bash
ssh root@147.93.183.55
cd /var/www
# Ver backups disponíveis (criados automaticamente pelo deploy-quick.sh)
ls -l | grep backup

# Restaurar
rm -rf finapp
mv finapp-backup-YYYYMMDD finapp
systemctl reload nginx
```

## 📝 Arquivos de Deploy Criados

| Arquivo | Descrição |
|---------|-----------|
| `deploy-quick.sh` | Deploy rápido (usa .deploy-config) |
| `deploy-setup.sh` | Deploy interativo completo |
| `deploy.sh` | Deploy com configuração manual |
| `check-deploy.sh` | Verificação pré-deploy |
| `.deploy-config` | Configurações do VPS (já preenchido) ✅ |
| `DEPLOY.md` | Documentação completa |
| `DEPLOY-QUICKSTART.md` | Guia rápido |
| `DEPLOY-README.md` | README simplificado |

## ⚠️ Avisos

- ✅ SSH configurado e testado
- ✅ Nginx instalado e ativo
- ✅ Espaço em disco suficiente (132 GB livres)
- ⚠️  Há alterações não commitadas no Git (pode commitar depois do deploy)

## 🎯 Resumo

**Status:** ✅ **PRONTO PARA DEPLOY**

Todas as verificações foram concluídas com sucesso. Você pode fazer o deploy agora executando:

```bash
./deploy-quick.sh
```

A aplicação será atualizada em aproximadamente 30 segundos e ficará disponível em:
**http://147.93.183.55**

---

**Última verificação:** 17/11/2025 às 12:15 GMT
