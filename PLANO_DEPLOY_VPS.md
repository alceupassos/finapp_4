# Plano de Deploy no VPS - FinApp Dashboard

## Objetivo
Fazer deploy da aplicação FinApp Dashboard no VPS `147.93.183.55` mantendo compatibilidade com outras aplicações já configuradas no NGINX e usando o domínio `www.ifin.app.br` que já possui certificado SSL.

## Contexto
- VPS: `root@147.93.183.55` (SSH já configurado)
- Domínio: `www.ifin.app.br` (DNS e certificado SSL já configurados)
- Caminho atual: `/var/www/finapp` (já existe estrutura)
- NGINX: Já tem outras aplicações configuradas (api-integracao.ifin.app.br, evo.angrax.com.br, ia.ifin.app.br, etc.)
- Aplicação: React/Vite build estático

## Tarefas

### 1. Preparar arquivos de configuração local

**1.1 Criar `.env.production`**
- Arquivo: `.env.production`
- Baseado nas variáveis do `.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.)
- Não incluir SUPABASE_SERVICE_ROLE_KEY (não necessário no frontend)
- Não incluir tokens F360 (conforme regras do projeto)

**1.2 Criar `.deploy-config`**
- Arquivo: `.deploy-config`
- Configurar:
  - `VPS_USER="root"`
  - `VPS_HOST="147.93.183.55"`
  - `VPS_PORT="22"`
  - `VPS_PATH="/var/www/finapp"`
  - `APP_DOMAIN="www.ifin.app.br"`

### 2. Verificar estrutura atual no VPS

**2.1 Conectar via SSH e verificar:**
- Estrutura atual em `/var/www/finapp`
- Configuração NGINX existente para `www.ifin.app.br`
- Certificado SSL válido
- Outras aplicações no NGINX (para não quebrar)

**2.2 Verificar configuração NGINX:**
- Arquivo: `/etc/nginx/sites-available/finapp` ou similar
- Verificar se já aponta para `www.ifin.app.br`
- Verificar se SSL está configurado corretamente

### 3. Build local da aplicação

**3.1 Executar build:**
- Comando: `npm run build`
- Verificar se `dist/` foi criado corretamente
- Verificar tamanho do build (deve ser ~2-3MB)

### 4. Criar script de deploy seguro

**4.1 Criar/atualizar `deploy-vps.sh`:**
- Fazer backup da versão atual no VPS
- Enviar arquivos do `dist/` via rsync
- Enviar `.env.production` como `.env` no VPS
- Ajustar permissões (www-data:www-data)
- **NÃO modificar configuração NGINX** (já existe e funciona)
- Apenas recarregar NGINX após upload

### 5. Executar deploy

**5.1 Upload dos arquivos:**
- Enviar conteúdo de `dist/` para `/var/www/finapp/current/`
- Enviar `.env.production` para `/var/www/finapp/current/.env`
- Excluir: node_modules, .git, arquivos temporários

**5.2 Ajustar permissões:**
- `chown -R www-data:www-data /var/www/finapp/current`
- `chmod -R 755 /var/www/finapp/current`

**5.3 Recarregar NGINX:**
- `systemctl reload nginx` (não restart, para não afetar outras apps)

### 6. Verificações pós-deploy

**6.1 Verificar arquivos no VPS:**
- `index.html` existe em `/var/www/finapp/current/`
- `assets/` existe e tem arquivos
- `.env` existe e tem variáveis corretas

**6.2 Verificar NGINX:**
- `nginx -t` (testar configuração)
- `systemctl status nginx` (verificar se está rodando)
- Verificar logs: `/var/log/nginx/error.log`

**6.3 Testar aplicação:**
- Acessar `https://www.ifin.app.br` no navegador
- Verificar se carrega corretamente
- Verificar console do navegador (F12) para erros
- Verificar se variáveis de ambiente estão sendo carregadas

**6.4 Verificar outras aplicações:**
- Testar se outras apps no NGINX ainda funcionam
- Verificar se não houve conflito de configuração

### 7. Documentação e rollback

**7.1 Criar script de rollback:**
- Script para restaurar versão anterior se necessário
- Manter backups com timestamp

**7.2 Documentar deploy:**
- Registrar data/hora do deploy
- Registrar versão deployada
- Listar arquivos enviados

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `.env.production` | Criar | Variáveis de ambiente para produção |
| `.deploy-config` | Criar | Configurações do VPS |
| `deploy-vps.sh` | Criar/Atualizar | Script de deploy seguro |
| `rollback.sh` | Criar | Script de rollback (opcional) |

## Comandos principais

```bash
# 1. Criar .env.production (baseado no .env.local)
# 2. Criar .deploy-config
# 3. Build local
npm run build

# 4. Executar deploy
./deploy-vps.sh

# 5. Verificar no VPS
ssh root@147.93.183.55 'ls -la /var/www/finapp/current'
ssh root@147.93.183.55 'nginx -t'
ssh root@147.93.183.55 'systemctl status nginx'
```

## Pontos de atenção

1. **Não modificar NGINX**: A configuração já existe e funciona. Apenas recarregar após upload.
2. **Respeitar outras apps**: Não alterar configurações que possam afetar outras aplicações.
3. **Backup automático**: Criar backup da versão anterior antes de fazer deploy.
4. **Variáveis de ambiente**: Garantir que `.env.production` tenha todas as variáveis necessárias.
5. **Permissões**: Sempre usar `www-data:www-data` para arquivos web.
6. **SSL**: Não mexer no certificado, já está configurado.

## Checklist final

- [ ] `.env.production` criado com variáveis corretas
- [ ] `.deploy-config` configurado
- [ ] Build local executado com sucesso
- [ ] Backup da versão anterior criado no VPS
- [ ] Arquivos enviados para `/var/www/finapp/current/`
- [ ] Permissões ajustadas
- [ ] NGINX recarregado (não reiniciado)
- [ ] Aplicação acessível em `https://www.ifin.app.br`
- [ ] Outras aplicações ainda funcionando
- [ ] Logs verificados sem erros críticos

