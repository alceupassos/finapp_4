# Instruções para Deploy no VPS

## Correções Aplicadas

1. ✅ **src/main.tsx** - Adicionado tratamento de erro e verificação do elemento root
2. ✅ **src/App.tsx** - Corrigido tipo de prop para SaldoBancarioChart (array → string)
3. ✅ **vite.config.ts** - Configurado para produção com code splitting
4. ✅ **deploy-vps-fixed.sh** - Script de deploy criado
5. ✅ **.deploy-config** - Configurações do VPS criadas

## Antes de Executar o Deploy

### 1. Criar arquivo .env.production

Crie o arquivo `.env.production` na raiz do projeto com as seguintes variáveis:

```bash
# Variáveis de Ambiente para Produção
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# Configurações opcionais
VITE_CNPJ_MATRIZ=26888098000159
VITE_USE_DEMO=false
VITE_ENABLE_ADMIN=false
```

**IMPORTANTE**: Substitua `https://seu-projeto.supabase.co` e `sua-chave-anon-aqui` pelos valores reais do seu Supabase.

### 2. Verificar Build Local

```bash
npm run build
```

O build deve completar sem erros.

### 3. Executar Deploy

```bash
./deploy-vps-fixed.sh
```

O script irá:
- Fazer backup da versão anterior
- Fazer build local
- Enviar arquivos para o VPS
- Ajustar permissões
- Reiniciar NGINX

## Verificações Pós-Deploy

1. Acesse `https://www.ifin.app.br` no navegador
2. Abra o console (F12) e verifique se há erros
3. Verifique se a aplicação carrega corretamente

## Comandos Úteis

```bash
# Ver logs do NGINX
ssh root@147.93.183.55 'sudo tail -f /var/log/nginx/error.log'

# Verificar status do NGINX
ssh root@147.93.183.55 'sudo systemctl status nginx'

# Ver arquivos no VPS
ssh root@147.93.183.55 'ls -la /var/www/finapp/current/'

# Verificar variáveis de ambiente
ssh root@147.93.183.55 'cat /var/www/finapp/current/.env'
```

## Troubleshooting

### Erro: "Arquivo .env.production não encontrado"
- Crie o arquivo `.env.production` com as variáveis corretas

### Erro: "Variáveis contêm valores placeholder"
- Edite `.env.production` e substitua os valores placeholder pelos valores reais

### Aplicação não carrega
- Verifique se o `.env` foi enviado corretamente
- Verifique os logs do NGINX
- Verifique o console do navegador para erros JavaScript

### Erro React.Children.only
- Já foi corrigido no código
- Se persistir, limpe o cache do navegador (Ctrl+Shift+R)

