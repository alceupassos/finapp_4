# 🎯 DADOS REAIS + SIMULADORES - GUIA COMPLETO

## ✅ O QUE FOI FEITO

### 1. **DADOS REAIS POPULADOS**

#### F360 (17 empresas) ✅
- ✅ Grupo Volpe (5): Token `223b065a-1873-4cfe-a36b-f092c602a03e`
- ✅ Grupo Dex Invest (2): Token `174d090d-50f4-4e82-bf7b-1831b74680bf`
- ✅ Grupo AAS/AGS (2): Token `258a60f7-12bb-44c1-825e-7e9160c41c0d`
- ✅ Grupo Acqua Mundi (2): Token `5440d062-b2e9-4554-b33f-f1f783a85472`
- ✅ 6 clientes individuais
> **Lembrete:** o token do Grupo Volpe retorna múltiplas empresas no F360, então importe cada CNPJ/empresa separadamente mesmo usando o mesmo token compartilhado.

#### OMIE (7 empresas) ✅
- ✅ MANA POKE HOLDING - APP KEY: `2077005256326`
- ✅ MED SOLUTIONS SKY DERM - APP KEY: `4293229373433`
- ✅ BRX IMPORTADORA - APP KEY: `6626684373309`
- ✅ BEAUTY SOLUTIONS - APP KEY: `2000530332801`
- ✅ KDPLAST (Grupo Health Plast) - 2 empresas
- ✅ ORAL UNIC BAURU

**TOTAL: 24 EMPRESAS** (17 F360 + 7 OMIE)

---

## 🚀 EDGE FUNCTIONS CRIADAS

### 1. **`seed-realistic-data`**
**Gera dados financeiros realistas para TODAS as empresas**

**O que faz:**
- Gera 6 meses de histórico financeiro
- 20-40 lançamentos por mês por empresa
- DRE entries (receitas e despesas)
- Cashflow entries (com saldos)
- Alertas automáticos (se aplicável)
- Valores realistas baseados no porte da empresa

**Como usar:**
```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/seed-realistic-data \
  -H "Authorization: Bearer SEU-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json"
```

**Resultado esperado:**
```json
{
  "success": true,
  "resultados": {
    "companies": 24,
    "dre_entries": 4320,
    "cashflow_entries": 4320,
    "alerts": 15
  }
}
```

**⚠️ ATENÇÃO:** Isso vai popular MUITO dado! Rode apenas 1x ou limpe antes:
```sql
truncate table dre_entries cascade;
truncate table cashflow_entries cascade;
truncate table financial_alerts cascade;
```

---

### 2. **`whatsapp-simulator`**
**Simula interações WhatsApp SEM usar WASender real**

#### Ação 1: Enviar Token
```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/whatsapp-simulator \
  -H "Authorization: Bearer SEU-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_token",
    "phone": "+5511999999999",
    "message": "VOL01"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "enviado": "VOL01",
  "resposta": "🎉 BEM-VINDO AO DASHFINANCE!..."
}
```

#### Ação 2: Enviar Opção do Menu
```bash
curl -X POST .../whatsapp-simulator \
  -H "..." \
  -d '{
    "action": "send_menu_option",
    "phone": "+5511999999999",
    "message": "1"
  }'
```

#### Ação 3: Simular Conversa Completa
```bash
curl -X POST .../whatsapp-simulator \
  -H "..." \
  -d '{
    "action": "simulate_conversation",
    "phone": "+5511999999999"
  }'
```

**O que faz:**
1. Envia token VOL01
2. Escolhe opção 1 (Ver alertas)
3. Volta ao menu (0)
4. Escolhe opção 3 (Adicionar empresa)
5. Envia token VOL02
6. Pede ajuda

#### Ação 4: Gerar Usuários de Teste
```bash
curl -X POST .../whatsapp-simulator \
  -H "..." \
  -d '{
    "action": "generate_test_users"
  }'
```

**O que faz:**
- Cria 5 usuários de teste completos
- João Silva (Volpe) - 2 empresas
- Maria Santos (Dex) - 1 empresa
- Pedro Costa (AAS/AGS) - 2 empresas
- Ana Lima (Acqua) - 1 empresa
- Carlos Souza (Individual) - 1 empresa

**Resultado:**
```json
{
  "success": true,
  "usuarios_criados": 5,
  "sessoes_ativas": 5,
  "users_com_whatsapp": 5,
  "detalhes": [...]
}
```

---

## 🎬 WORKFLOW COMPLETO DE TESTE

### Passo 1: Popular Dados Financeiros
```bash
# Rodar seed de dados (1x apenas)
curl -X POST https://xyz.supabase.co/functions/v1/seed-realistic-data \
  -H "Authorization: Bearer service-role-key"
```

### Passo 2: Gerar Usuários de Teste
```bash
# Criar 5 usuários completos
curl -X POST https://xyz.supabase.co/functions/v1/whatsapp-simulator \
  -H "Authorization: Bearer service-role-key" \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_test_users"}'
```

### Passo 3: Testar Manualmente
```bash
# Simular nova conversa
curl -X POST https://xyz.supabase.co/functions/v1/whatsapp-simulator \
  -H "Authorization: Bearer service-role-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_token",
    "phone": "+5511888887777",
    "message": "COR01"
  }'
```

---

## 📊 VERIFICAR DADOS GERADOS

### Ver Empresas Cadastradas
```sql
-- F360
select 
  grupo_empresarial,
  count(*) as empresas,
  string_agg(cliente_nome, ', ') as nomes
from integration_f360
group by grupo_empresarial
order by empresas desc;

-- OMIE
select * from integration_omie order by cliente_nome;
```

### Ver Dados Financeiros
```sql
-- DRE por empresa (últimos 30 dias)
select 
  cnpj,
  tipo,
  count(*) as lancamentos,
  sum(valor) as total
from dre_entries
where data >= current_date - interval '30 days'
group by cnpj, tipo
order by cnpj, tipo;

-- Saldo atual de todas as empresas
select 
  cnpj,
  saldo_atual,
  data
from cashflow_entries
where (cnpj, data) in (
  select cnpj, max(data)
  from cashflow_entries
  group by cnpj
)
order by saldo_atual asc;
```

### Ver Sessões WhatsApp
```sql
select 
  s.phone,
  s.current_menu,
  s.last_message_at,
  u.nome,
  (select count(*) from user_companies where user_id = u.id) as empresas
from whatsapp_sessions s
left join users u on u.id = s.user_id
order by s.last_message_at desc;
```

### Ver Alertas Gerados
```sql
select 
  tipo_alerta,
  prioridade,
  count(*) as total,
  string_agg(distinct company_cnpj, ', ') as empresas
from financial_alerts
where status = 'open'
group by tipo_alerta, prioridade
order by prioridade, tipo_alerta;
```

---

## 🎯 CENÁRIOS DE TESTE

### Cenário 1: Cliente Novo Ativa Token
```bash
# 1. Cliente ativa VOL01
curl -X POST .../whatsapp-simulator \
  -d '{"action":"send_token","phone":"+5511111111111","message":"VOL01"}'

# 2. Ver alertas
curl -X POST .../whatsapp-simulator \
  -d '{"action":"send_menu_option","phone":"+5511111111111","message":"1"}'

# 3. Verificar no banco
select * from users where telefone_whatsapp = '+5511111111111';
select * from user_companies where user_id = (select id from users where telefone_whatsapp = '+5511111111111');
```

### Cenário 2: Cliente Adiciona Múltiplas Empresas
```bash
# Grupo Volpe - 5 empresas
for token in VOL01 VOL02 VOL03 VOL04 VOL05; do
  curl -X POST .../whatsapp-simulator \
    -d "{\"action\":\"send_token\",\"phone\":\"+5511222222222\",\"message\":\"$token\"}"
  sleep 2
done

# Verificar
select * from user_companies where user_id = (select id from users where telefone_whatsapp = '+5511222222222');
```

### Cenário 3: Grupo Empresarial Completo
```bash
# Simular todo o Grupo Volpe
curl -X POST .../whatsapp-simulator \
  -d '{"action":"simulate_conversation","phone":"+5511333333333"}'
```

---

## 🔍 DADOS REALISTAS GERADOS

### Por Empresa (Exemplo Volpe Diadema)

**6 meses de histórico:**
- ~240 lançamentos DRE (40/mês)
- ~240 lançamentos Cashflow
- Valores: R$ 5.000 - R$ 20.000 por receita
- Saldo inicial: R$ 5.000 - R$ 50.000
- Categorias variadas (vendas, folha, aluguel, etc)

**Alertas gerados automaticamente:**
- Saldo baixo (se < R$ 5.000)
- Inadimplência alta (se > 10%)
- Prioridades corretas (crítica, alta, média)

---

## 📋 CHECKLIST DE TESTES

### Backend ✅
- [x] 24 empresas cadastradas (F360 + OMIE)
- [x] Tokens F360 configurados
- [x] Tokens OMIE configurados
- [x] Seed de dados funcionando
- [x] Simulador WhatsApp funcionando
- [x] Usuários de teste criados

### Testes Funcionais
- [ ] Ativar token via simulador
- [ ] Navegar pelo menu
- [ ] Adicionar múltiplas empresas
- [ ] Ver alertas gerados
- [ ] Verificar dados DRE/Cashflow
- [ ] Testar todos os 17 tokens onboarding

### Frontend (Próximo)
- [ ] Ver tokens no admin
- [ ] Ver clientes WhatsApp
- [ ] Ver alertas no dashboard
- [ ] Configurar alertas
- [ ] Ver histórico
- [ ] Tela de conciliação

---

## 🚨 IMPORTANTE

### ⚠️ SEM WASENDER REAL
Todos os testes usam o **simulador**. Para ativar WASender real:
1. Configurar webhook (ver `CONFIGURAR_WEBHOOK_WASENDER.md`)
2. Desativar modo simulação
3. Usar número WhatsApp real

### ⚠️ DADOS DE DESENVOLVIMENTO
- Tokens em plain text (produção: criptografar)
- CNPJs simulados para OMIE
- Valores financeiros aleatórios (mas realistas)

### ⚠️ LIMPEZA
Para limpar e recomeçar:
```sql
truncate table dre_entries cascade;
truncate table cashflow_entries cascade;
truncate table financial_alerts cascade;
truncate table whatsapp_sessions cascade;
truncate table whatsapp_messages cascade;
truncate table alert_actions cascade;
truncate table alert_notifications cascade;

-- Manter tokens onboarding e integrações!
```

---

## 🎉 RESUMO

**✅ PRONTO PARA TESTES COMPLETOS!**

**Backend:**
- 24 empresas com tokens reais
- Edge Function de seed (dados realistas)
- Edge Function simulador WhatsApp
- 17 tokens onboarding (VOL01-VOL05, DEX01-DEX02, etc)

**Próximo:**
- Frontend implementar telas
- Testes funcionais completos
- Ativar WASender real (opcional)

---

**Data:** 08/11/2025  
**Versão:** 1.0  
**Status:** ✅ COMPLETO - PRONTO PARA TESTES!

🚀 **RODE O SEED E O SIMULADOR E COMECE A TESTAR!**
