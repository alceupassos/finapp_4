# 🎯 GUIA DEFINITIVO DE RECUPERAÇÃO - FINAPP_4

**Data:** 29/11/2025  
**Versão:** 1.0

---

## 📊 RESUMO DO PROBLEMA

As correções que você documentou **nunca foram commitadas/pushadas** para o GitHub. Quando outra IDE sincronizou, o código local foi sobrescrito com a versão do GitHub (sem as correções).

---

## ✅ ARQUIVOS CORRIGIDOS PRONTOS

Baixe estes arquivos:

1. **[auth.ts.CORRIGIDO](computer:///mnt/user-data/outputs/auth.ts.CORRIGIDO)** - Login com busca de empresa
2. **[supabaseRest.ts.CORRIGIDO](computer:///mnt/user-data/outputs/supabaseRest.ts.CORRIGIDO)** - Novo método getUserCompanies
3. **[APLICAR_CORRECOES.sh](computer:///mnt/user-data/outputs/APLICAR_CORRECOES.sh)** - Script automático

---

## 🔧 PASSO A PASSO MANUAL

### Passo 1: Baixar os arquivos corrigidos

Salve os arquivos acima no seu Mac (Downloads ou Desktop).

### Passo 2: Aplicar correções

```bash
# Ir para o projeto
cd ~/finapp_v4

# Criar backup
cp src/services/auth.ts src/services/auth.ts.backup
cp src/services/supabaseRest.ts src/services/supabaseRest.ts.backup

# Copiar arquivos corrigidos (ajuste o caminho se necessário)
cp ~/Downloads/auth.ts.CORRIGIDO src/services/auth.ts
cp ~/Downloads/supabaseRest.ts.CORRIGIDO src/services/supabaseRest.ts
```

### Passo 3: Verificar .env.local

```bash
# Verificar se existe e tem conteúdo
cat .env.local

# Se estiver vazio ou não existir:
cp .env.production .env.local
```

### Passo 4: Testar build

```bash
npm run lint
npm run build
```

### Passo 5: COMMITAR E PUSHAR (CRÍTICO!)

```bash
git add src/services/auth.ts src/services/supabaseRest.ts
git commit -m "fix: correções auth + supabaseRest definitivas"
git push origin restore-frontend
```

### Passo 6: Testar

```bash
npm run dev -- --port 5173
```

Acesse http://localhost:5173 e faça login. Verifique no console do navegador se aparece:
- `✅ Empresa padrão do usuário: [CNPJ]`

### Passo 7: Merge para main (após testar)

```bash
git checkout main
git merge restore-frontend
git push origin main
```

---

## 🛡️ PROTEÇÃO CONTRA RECORRÊNCIA

### 1. Sempre commitar ANTES de trocar de IDE

```bash
# Antes de abrir Cursor, Antigravity, etc:
git add -A
git commit -m "wip: salvando trabalho"
git push
```

### 2. Verificar worktrees

```bash
# Listar worktrees
git worktree list

# Se tiver mais de uma linha, remova os extras:
git worktree remove [caminho]
```

### 3. Usar script start.sh

O script `start.sh` que você tem mata processos antigos e inicia limpo.

---

## 💰 ECONOMIA DE CUSTOS

| Tarefa | Modelo Recomendado |
|--------|-------------------|
| Diagnóstico complexo | Opus 4.5 |
| Correções de código | **Sonnet 4** (mais barato) |
| Perguntas simples | **Sonnet 4** |
| Manutenção futura | **Sonnet 4** |

**Agora que o problema foi identificado, use Sonnet 4 para as próximas tarefas.**

---

## ❓ SE AINDA DER PROBLEMA

Execute e me envie o resultado:

```bash
cd ~/finapp_v4 && git status && git log --oneline -5 && grep -n "getUserCompanies" src/services/*.ts
```

---

## 📁 Estrutura de Arquivos Corrigidos

```
src/services/
├── auth.ts           # ✅ Com busca de empresa após login
└── supabaseRest.ts   # ✅ Com getUserCompanies() novo
```

---

**Boa sorte! 🚀**
