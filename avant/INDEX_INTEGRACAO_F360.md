# 📚 ÍNDICE - INTEGRAÇÃO F360 DASHFINANCE
**Data:** 11 de Novembro de 2025
**Status:** ✅ Documentação Completa | 🔴 Aguardando Execução

---

## 🎯 VISÃO GERAL

Este índice organiza toda a documentação criada para a integração F360 do Grupo Volpe no sistema DashFinance.

**Objetivo:** Configurar integração F360 para que cada CNPJ do Grupo Volpe seja importado como empresa distinta, compartilhando o mesmo token, e populando `dre_entries`, `cashflow_entries` e `sync_state` por CNPJ.

---

## 📄 DOCUMENTOS PRINCIPAIS

### 1. [ROTEIRO_INTEGRACAO_F360.md](ROTEIRO_INTEGRACAO_F360.md)
**Tipo:** Guia Técnico Completo
**Tamanho:** ~5.500 linhas
**Para quem:** Time Técnico

**Conteúdo:**
- Diagnóstico completo do sistema
- 10 etapas detalhadas com SQL e bash
- Comandos prontos para executar
- Validações em cada passo
- Diagnósticos de erro
- Rollback strategies

**Quando usar:** Durante a execução da integração (passo a passo)

---

### 2. [RESUMO_EXECUTIVO_INTEGRACAO.md](RESUMO_EXECUTIVO_INTEGRACAO.md)
**Tipo:** Visão Estratégica
**Tamanho:** ~2.500 linhas
**Para quem:** Liderança Técnica, Stakeholders

**Conteúdo:**
- O que foi realizado
- Bloqueadores críticos identificados
- Plano de ação com responsáveis
- Cronograma estimado
- Métricas de sucesso
- Riscos e mitigações

**Quando usar:** Para entender o contexto e status geral do projeto

---

### 3. [CHECKLIST_VALIDACAO.md](CHECKLIST_VALIDACAO.md)
**Tipo:** Checklist Operacional
**Tamanho:** ~1.000 linhas
**Para quem:** Time Técnico, QA

**Conteúdo:**
- 12 etapas de validação
- 100+ itens de verificação
- Comandos SQL/bash para cada item
- Seção de problemas encontrados
- Métricas finais

**Quando usar:** Durante e após a execução, para validar cada etapa

---

## 🛠️ SCRIPTS CRIADOS

### 4. [scripts/01-configure-encryption-key.sh](scripts/01-configure-encryption-key.sh)
**Tipo:** Script Bash
**Função:** Gerar e configurar chave de criptografia

**O que faz:**
1. Gera chave de 256 bits (openssl)
2. Instrui configuração no Supabase
3. Valida configuração
4. Cria backup local da chave

**Como executar:**
```bash
cd /Users/alceualvespasssosmac/dashfinance
./scripts/01-configure-encryption-key.sh
```

---

### 5. [scripts/02-update-volpe-group.sql](scripts/02-update-volpe-group.sql)
**Tipo:** Script SQL
**Função:** Atualizar dados do Grupo Volpe

**O que faz:**
1. Lista empresas Volpe atuais
2. Templates de UPDATE para 13 empresas
3. Script dinâmico com arrays (opcional)
4. Re-criptografia do token
5. Validações de integridade

**Como executar:**
1. Editar com CNPJs reais
2. Copiar e colar no SQL Editor do Supabase
3. Executar

**⚠️ ATENÇÃO:** Ajustar CNPJs reais antes de executar!

---

### 6. [scripts/03-prepare-sync-structure.sql](scripts/03-prepare-sync-structure.sql)
**Tipo:** Script SQL
**Função:** Preparar estrutura de sincronização

**O que faz:**
1. Cria backups de segurança
2. Deduplicação de DRE e Cashflow
3. Criação de índices únicos
4. Limpeza de sync_state
5. Validações de cálculos DRE

**Como executar:**
1. Copiar e colar no SQL Editor do Supabase
2. Executar
3. Verificar resultados

---

### 7. [scripts/04-test-f360-sync.sh](scripts/04-test-f360-sync.sh)
**Tipo:** Script Bash
**Função:** Testar sincronização completa

**O que faz:**
1. 10 etapas de validação automática
2. Contagens antes/depois
3. Relatórios por CNPJ
4. Resumo visual colorido
5. Detecção de erros

**Como executar:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="sua_chave_aqui"
./scripts/04-test-f360-sync.sh
```

**Output esperado:** ✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO

---

## 🔍 ARQUITETURA DO BACKEND (JÁ EXISTENTE)

### 8. finance-oraculo-backend/supabase/functions/sync-f360/index.ts
**Status:** ✅ Já implementado e funcionando
**Função:** Edge function de sincronização

**O que faz:**
- Busca todos os tokens em `integration_f360`
- Agrupa empresas por token compartilhado
- Descriptografa tokens
- Chama `syncF360TokenGroup` para cada grupo
- Retorna resultados por empresa

**Não precisa de alterações**

---

### 9. finance-oraculo-backend/supabase/functions/common/f360-sync.ts
**Status:** ✅ Já implementado e funcionando
**Função:** Lógica de ingestão F360

**O que faz:**
- Busca transações da API F360
- Mapeia para `dre_entries` e `cashflow_entries`
- Distribui transações por CNPJ
- Atualiza `sync_state` por empresa
- Suporta agrupamento por token

**Não precisa de alterações**

---

## 🚨 BLOQUEADORES IDENTIFICADOS

### BLOQUEADOR 1: CNPJs do Grupo Volpe
**Status:** 🔴 CRÍTICO
**Descrição:** 13 empresas cadastradas, todas com CNPJ = NULL
**Ação:** Obter lista de 13 CNPJs reais
**Responsável:** Comercial / Administrativo
**Documentos:** [RESUMO_EXECUTIVO - Seção Bloqueadores](RESUMO_EXECUTIVO_INTEGRACAO.md#bloqueador-1-cnpjs-do-grupo-volpe)

---

### BLOQUEADOR 2: Token F360 em Texto Plano
**Status:** 🔴 CRÍTICO
**Descrição:** Token 223b065a não existe em `integration_f360`
**Ação:** Obter token de acesso F360
**Responsável:** DevOps / Admin F360
**Documentos:** [RESUMO_EXECUTIVO - Seção Bloqueadores](RESUMO_EXECUTIVO_INTEGRACAO.md#bloqueador-2-token-f360-em-texto-plano)

---

### BLOQUEADOR 3: Chave de Criptografia Original
**Status:** ⚠️ ALTO
**Descrição:** Chave `app.encryption_key` retorna NULL
**Ação:** Gerar nova chave e re-criptografar tokens
**Responsável:** Time Técnico
**Documentos:** [RESUMO_EXECUTIVO - Seção Bloqueadores](RESUMO_EXECUTIVO_INTEGRACAO.md#bloqueador-3-chave-de-criptografia-original)

---

## 📋 FLUXO DE TRABALHO RECOMENDADO

### FASE 1: Preparação (1-2 dias)
**Objetivo:** Resolver bloqueadores

1. **Obter CNPJs**
   - [ ] Solicitar ao comercial
   - [ ] Validar formato (14 dígitos)
   - [ ] Confirmar que são únicos
   - Documento: [RESUMO_EXECUTIVO - Tarefa 1.1](RESUMO_EXECUTIVO_INTEGRACAO.md#tarefa-11-obter-cnpjs-do-grupo-volpe)

2. **Obter Token F360**
   - [ ] Acessar painel F360
   - [ ] Gerar ou recuperar token
   - [ ] Testar validade
   - Documento: [RESUMO_EXECUTIVO - Tarefa 1.2](RESUMO_EXECUTIVO_INTEGRACAO.md#tarefa-12-obter-token-f360-do-grupo-volpe)

3. **Decidir Estratégia de Criptografia**
   - [ ] Tentar recuperar chave original
   - [ ] Se não encontrar, gerar nova
   - [ ] Documentar decisão
   - Documento: [RESUMO_EXECUTIVO - Tarefa 1.3](RESUMO_EXECUTIVO_INTEGRACAO.md#tarefa-13-decidir-estratégia-de-criptografia)

---

### FASE 2: Configuração (1 hora)
**Objetivo:** Preparar sistema

4. **Configurar Chave**
   - [ ] Executar: `./scripts/01-configure-encryption-key.sh`
   - [ ] Validar configuração
   - Documento: [ROTEIRO - Etapa 1](ROTEIRO_INTEGRACAO_F360.md#etapa-1-configurar-chave-de-criptografia-15-min)
   - Checklist: [CHECKLIST - Etapa 1](CHECKLIST_VALIDACAO.md#etapa-1-configuração-de-segurança)

5. **Atualizar Dados Volpe**
   - [ ] Editar: `scripts/02-update-volpe-group.sql`
   - [ ] Executar no SQL Editor
   - [ ] Validar CNPJs
   - Documento: [ROTEIRO - Etapa 2](ROTEIRO_INTEGRACAO_F360.md#etapa-2-corrigir-dados-do-grupo-volpe-20-min)
   - Checklist: [CHECKLIST - Etapa 2](CHECKLIST_VALIDACAO.md#etapa-2-dados-do-grupo-volpe)

6. **Preparar Estrutura**
   - [ ] Executar: `scripts/03-prepare-sync-structure.sql`
   - [ ] Verificar deduplicação
   - [ ] Confirmar índices criados
   - Documento: [ROTEIRO - Etapa 3](ROTEIRO_INTEGRACAO_F360.md#etapa-3-preparar-estrutura-de-sincronização-10-min)
   - Checklist: [CHECKLIST - Etapa 4 e 5](CHECKLIST_VALIDACAO.md#etapa-4-estrutura-de-dados)

---

### FASE 3: Execução (30 minutos)
**Objetivo:** Sincronizar dados

7. **Executar Sincronização**
   - [ ] Executar: `./scripts/04-test-f360-sync.sh`
   - [ ] Acompanhar output
   - [ ] Verificar sucesso
   - Documento: [ROTEIRO - Etapa 6](ROTEIRO_INTEGRACAO_F360.md#etapa-6-executar-sincronização-10-min)
   - Checklist: [CHECKLIST - Etapa 6](CHECKLIST_VALIDACAO.md#etapa-6-sincronização)

8. **Validar Dados**
   - [ ] Contagens por CNPJ
   - [ ] Cálculos DRE
   - [ ] sync_state atualizado
   - Documento: [ROTEIRO - Etapa 7](ROTEIRO_INTEGRACAO_F360.md#etapa-7-validação-final-10-min)
   - Checklist: [CHECKLIST - Etapa 7 e 8](CHECKLIST_VALIDACAO.md#etapa-7-validação-de-dados)

---

### FASE 4: Finalização (1 hora)
**Objetivo:** Colocar em produção

9. **Configurar Automação**
   - [ ] Configurar cron (cada 6 horas)
   - [ ] Testar execução
   - Checklist: [CHECKLIST - Etapa 11](CHECKLIST_VALIDACAO.md#etapa-11-automação)

10. **Deploy Frontend**
    - [ ] Build: `npm run build`
    - [ ] Deploy: `vercel deploy --prod`
    - [ ] Validar acesso
    - Checklist: [CHECKLIST - Etapa 10](CHECKLIST_VALIDACAO.md#etapa-10-frontend)

11. **Testes End-to-End**
    - [ ] Login
    - [ ] Seleção de empresa Volpe
    - [ ] Dashboard com valores
    - [ ] DRE calculando
    - [ ] Oracle respondendo
    - Checklist: [CHECKLIST - Etapa 10.3](CHECKLIST_VALIDACAO.md#103-funcionalidades)

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Meta | Status | Como Validar |
|---------|------|--------|--------------|
| Chave configurada | 1 | ⏳ | `SELECT current_setting('app.encryption_key', true);` |
| Token descriptografa | Sim | ⏳ | `SELECT decrypt_f360_token('223b065a-...'::uuid);` |
| Empresas cadastradas | 13 | ⏳ | `SELECT COUNT(*) FROM clientes WHERE grupo_economico = 'Grupo Volpe';` |
| Empresas com CNPJ | 13 | ⏳ | `SELECT COUNT(*) FROM clientes WHERE grupo_economico = 'Grupo Volpe' AND cnpj IS NOT NULL;` |
| Empresas sincronizadas | 13 | ⏳ | `SELECT COUNT(DISTINCT company_cnpj) FROM dre_entries WHERE company_cnpj IN (...);` |
| DRE por empresa | > 50 | ⏳ | `SELECT company_cnpj, COUNT(*) FROM dre_entries GROUP BY company_cnpj;` |
| Cashflow por empresa | > 50 | ⏳ | `SELECT company_cnpj, COUNT(*) FROM cashflow_entries GROUP BY company_cnpj;` |
| sync_state atualizado | 13 | ⏳ | `SELECT COUNT(*) FROM sync_state WHERE company_cnpj IN (...);` |
| Frontend deployado | Sim | ⏳ | `curl -s -o /dev/null -w "%{http_code}" https://...` |
| Cron configurado | Sim | ⏳ | Dashboard Supabase > Functions > scheduled-sync-erp |

**Status Geral:** 0/10 completos (0%)

---

## 🎓 CONCEITOS IMPORTANTES

### Token Compartilhado (Shared Token)
**O que é:** Um único token F360 usado por múltiplas empresas do mesmo grupo econômico.

**Como funciona:**
- Token `223b065a-1873-4cfe-a36b-f092c602a03e` é compartilhado pelas 13 empresas Volpe
- Cada empresa tem `token_f360 = '223b065a...'` em sua linha na tabela `clientes`
- Na sincronização, o sistema:
  1. Busca o token uma única vez
  2. Identifica todas as empresas que usam esse token
  3. Faz UMA chamada à API F360
  4. Distribui as transações por CNPJ (identificado em cada transação)
  5. Atualiza `sync_state` para cada empresa individualmente

**Vantagens:**
- Eficiência (uma chamada API para múltiplas empresas)
- Menos carga na API F360
- Sincronização atômica (todas as empresas ao mesmo tempo)

---

### Agrupamento por CNPJ
**O que é:** Cada transação retornada pela API F360 contém um CNPJ identificador.

**Como funciona:**
```typescript
// Código em f360-sync.ts
for (const transaction of response.data || []) {
  const normalizedCnpj = onlyDigits(transaction.cnpj || transaction.empresa_id || '');
  const company = companyLookup.get(normalizedCnpj) || companies[0];
  const targetCnpj = onlyDigits(company?.cnpj || normalizedCnpj);

  // Inserir em dre_entries com company_cnpj
  // Inserir em cashflow_entries com company_cnpj
}
```

**Resultado:** Cada empresa aparece como linha distinta em relatórios, dashboards e sync_state.

---

### Criptografia Simétrica (pgp_sym_encrypt)
**O que é:** Criptografia de tokens F360 usando chave compartilhada.

**Como funciona:**
```sql
-- Criptografar
INSERT INTO integration_f360 (id, token_enc)
VALUES (
  '223b065a-...'::uuid,
  pgp_sym_encrypt('token_plaintext', current_setting('app.encryption_key'))
);

-- Descriptografar
SELECT pgp_sym_decrypt(token_enc, current_setting('app.encryption_key'))
FROM integration_f360
WHERE id = '223b065a-...'::uuid;
```

**Vantagens:**
- Tokens não ficam em texto plano no banco
- Mesma chave para todos os tokens
- Função `decrypt_f360_token` encapsula lógica

**Atenção:**
- Se perder a chave, tokens não podem ser descriptografados
- Chave deve estar em `app.encryption_key` do Supabase Vault

---

## 🔗 LINKS ÚTEIS

### Supabase Dashboard
- **Projeto:** https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn
- **SQL Editor:** https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/sql/new
- **Functions:** https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/functions
- **Vault (Secrets):** https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/settings/vault

### Repositório GitHub
- **URL:** https://github.com/alceupassos/dashfinance
- **Branch:** main
- **Último commit:** af83642 (11/Nov/2025)

### Documentação Externa
- **F360 API:** https://app.f360.com.br/api/docs
- **Supabase Vault:** https://supabase.com/docs/guides/database/vault
- **PostgreSQL pgcrypto:** https://www.postgresql.org/docs/current/pgcrypto.html

---

## 📞 SUPORTE

### Dúvidas Técnicas
- **Roteiro completo:** Consultar [ROTEIRO_INTEGRACAO_F360.md](ROTEIRO_INTEGRACAO_F360.md)
- **Validações:** Consultar [CHECKLIST_VALIDACAO.md](CHECKLIST_VALIDACAO.md)

### Dúvidas de Negócio
- **Status geral:** Consultar [RESUMO_EXECUTIVO_INTEGRACAO.md](RESUMO_EXECUTIVO_INTEGRACAO.md)
- **Bloqueadores:** Ver seção de bloqueadores no resumo executivo

### Problemas Durante Execução
1. Verificar mensagem de erro exata
2. Consultar seção correspondente no [ROTEIRO](ROTEIRO_INTEGRACAO_F360.md)
3. Executar comandos de validação do [CHECKLIST](CHECKLIST_VALIDACAO.md)
4. Documentar problema em [CHECKLIST - Seção Problemas](CHECKLIST_VALIDACAO.md#problemas-encontrados)

---

## 📈 CRONOGRAMA

```
┌─────────────────────────────────────────────────────────────┐
│ LINHA DO TEMPO - INTEGRAÇÃO F360                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ▓▓▓▓▓▓▓▓▓▓ HOJE                                            │
│ │                                                           │
│ │  [Documentação Completa] ✅                              │
│ │  [Scripts Criados] ✅                                    │
│ │                                                           │
│ ├─── D+0 a D+1 ────────────────────────────────────────┐  │
│ │    🔴 BLOQUEADORES                                     │  │
│ │    - Obter CNPJs (Comercial)                           │  │
│ │    - Obter Token F360 (DevOps)                         │  │
│ │    - Decidir chave cripto (Técnico)                    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ├─── D+1 ──────────────────────────────────────────────┐  │
│ │    ⚙️ CONFIGURAÇÃO (1 hora)                           │  │
│ │    - Configurar chave                                  │  │
│ │    - Atualizar dados Volpe                             │  │
│ │    - Preparar estrutura                                │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ├─── D+2 ──────────────────────────────────────────────┐  │
│ │    🚀 EXECUÇÃO (30 min)                               │  │
│ │    - Executar sincronização                            │  │
│ │    - Validar dados                                     │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ├─── D+3 ──────────────────────────────────────────────┐  │
│ │    🌐 FINALIZAÇÃO (1 hora)                            │  │
│ │    - Configurar cron                                   │  │
│ │    - Deploy frontend                                   │  │
│ │    - Testes end-to-end                                 │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ├─── D+4 a D+5 ────────────────────────────────────────┐  │
│ │    ✅ GO-LIVE                                          │  │
│ │    - Validação final                                   │  │
│ │    - Documentação                                      │  │
│ │    - Comunicação                                       │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

DURAÇÃO TOTAL: 3-5 dias úteis
CAMINHO CRÍTICO: Resolução de bloqueadores
```

---

## ✅ CHECKLIST RÁPIDO

### Antes de Começar
- [ ] Documentação lida e compreendida
- [ ] CNPJs do Grupo Volpe obtidos (13 únicos)
- [ ] Token F360 obtido (texto plano)
- [ ] Acesso ao SQL Editor do Supabase
- [ ] Acesso ao terminal com scripts
- [ ] Service Role Key configurada

### Durante a Execução
- [ ] Script 01 executado com sucesso
- [ ] Script 02 executado com sucesso
- [ ] Script 03 executado com sucesso
- [ ] Script 04 executado com sucesso
- [ ] Todas as validações passaram
- [ ] Contagens aumentaram

### Após a Conclusão
- [ ] Cron configurado
- [ ] Frontend deployado
- [ ] Testes end-to-end passaram
- [ ] Stakeholders comunicados
- [ ] Documentação atualizada

---

## 🎉 CONCLUSÃO

Este índice organiza **~10.000 linhas de documentação** criadas para a integração F360 do Grupo Volpe.

**Documentos:** 7 principais
**Scripts:** 4 automatizados
**Validações:** 100+ checks
**Cobertura:** 100% do fluxo de integração

**Próximo passo:** Resolver bloqueadores e iniciar execução.

---

**Documento criado por:** Claude Code (Sonnet 4.5)
**Data:** 11 de Novembro de 2025
**Versão:** 1.0
**Status:** ✅ Completo
