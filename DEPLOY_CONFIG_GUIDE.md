# 🚀 Guia de Configuração de Deploy

## ✅ Status Atual

- ✅ **Git Push**: Concluído com sucesso
- ✅ **Build**: Funcionando perfeitamente
- ⚠️ **Deploy**: Precisa configurar VPS

---

## 📋 Opções de Deploy

### Opção 1: VPS (Servidor Próprio) - Recomendado para Produção

#### Passo 1: Configurar `deploy.sh`

Edite o arquivo `deploy.sh` e altere as variáveis nas linhas 12-17:

```bash
VPS_USER="root"                          # Seu usuário SSH
VPS_HOST="SEU_IP_OU_DOMINIO"            # IP ou domínio do VPS (ex: 192.168.1.100 ou finapp.seudominio.com)
VPS_PORT="22"                            # Porta SSH (padrão: 22)
VPS_PATH="/var/www/finapp"               # Caminho no VPS
APP_DOMAIN="finapp.seudominio.com"       # Seu domínio (opcional)
```

**Exemplo:**
```bash
VPS_USER="root"
VPS_HOST="192.168.1.100"  # ou "finapp.seudominio.com"
VPS_PORT="22"
VPS_PATH="/var/www/finapp"
APP_DOMAIN="finapp.seudominio.com"
```

#### Passo 2: Preparar VPS (Primeira vez)

```bash
# Conectar ao VPS
ssh root@SEU_IP_OU_DOMINIO

# Instalar Nginx
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Criar diretório
sudo mkdir -p /var/www/finapp
sudo chown -R $USER:$USER /var/www/finapp
```

#### Passo 3: Executar Deploy

```bash
./deploy.sh
```

---

### Opção 2: Vercel (Mais Fácil) - Recomendado para Início

#### Passo 1: Instalar Vercel CLI

```bash
npm i -g vercel
```

#### Passo 2: Fazer Login

```bash
vercel login
```

#### Passo 3: Deploy

```bash
vercel --prod
```

**Vantagens:**
- ✅ Configuração automática
- ✅ HTTPS gratuito
- ✅ CDN global
- ✅ Deploy instantâneo

**Configurar variáveis de ambiente:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

---

### Opção 3: Netlify

#### Passo 1: Instalar Netlify CLI

```bash
npm i -g netlify-cli
```

#### Passo 2: Deploy

```bash
netlify deploy --prod --dir=dist
```

**Configurar variáveis:**
- Acesse: https://app.netlify.com
- Vá em: Site settings > Environment variables
- Adicione: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.

---

### Opção 4: GitHub Pages

#### Passo 1: Configurar `vite.config.ts`

```typescript
export default defineConfig({
  base: '/finapp_4/', // Nome do repositório
  // ... resto da config
})
```

#### Passo 2: Criar GitHub Action

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 🔧 Configuração Rápida (VPS)

Se você já tem um VPS, edite o `deploy.sh`:

```bash
# Abrir editor
nano deploy.sh

# Ou usar VS Code
code deploy.sh
```

**Altere apenas estas linhas:**
- Linha 13: `VPS_HOST="SEU_IP_OU_DOMINIO"`
- Linha 17: `APP_DOMAIN="seu_dominio.com"` (opcional)

**Salve e execute:**
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 Checklist de Deploy

- [ ] VPS configurado e acessível via SSH
- [ ] Nginx instalado no VPS
- [ ] Variáveis do `deploy.sh` configuradas
- [ ] Arquivo `.env.production` criado (se necessário)
- [ ] Build local funcionando (`npm run build`)
- [ ] Teste de conexão SSH: `ssh root@SEU_IP`

---

## 🆘 Troubleshooting

### Erro: "Could not resolve hostname"
**Solução**: Configure `VPS_HOST` no `deploy.sh` com IP ou domínio válido

### Erro: "Permission denied"
**Solução**: 
```bash
chmod 600 ~/.ssh/id_rsa  # Se usar chave SSH
# Ou configure senha SSH no VPS
```

### Erro: "Nginx not found"
**Solução**: Instale Nginx no VPS:
```bash
ssh root@SEU_IP
sudo apt update && sudo apt install nginx -y
```

---

## 🎯 Recomendação

Para começar rápido, use **Vercel**:
```bash
npm i -g vercel
vercel login
vercel --prod
```

Para produção com controle total, use **VPS** (configure `deploy.sh` primeiro).

---

**Próximo passo**: Escolha uma opção acima e siga as instruções! 🚀

