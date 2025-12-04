# Checklist de Testes de Filtros na Interface

## Objetivo
Verificar se todos os filtros (empresa, período, consolidação) estão funcionando corretamente em todas as páginas.

---

## Página: Dashboard

### Filtros a Testar
- [ ] Seleção de empresa única
- [ ] Seleção de múltiplas empresas (consolidação)
- [ ] Filtro por período (Dia/Semana/Mês/Ano)
- [ ] Filtro por mês específico (selectedMonth)

### Testes
1. **Filtro por Empresa Única**
   - Selecionar apenas uma empresa
   - Verificar se KPIs mostram apenas dados dessa empresa
   - Verificar se gráficos mostram apenas dados dessa empresa

2. **Filtro por Múltiplas Empresas (Consolidação)**
   - Selecionar 2-3 empresas
   - Verificar se KPIs somam dados de todas empresas selecionadas
   - Verificar se gráficos mostram dados consolidados
   - Verificar se totais estão corretos (soma individual = consolidado)

3. **Filtro por Período**
   - Alterar período (Dia/Semana/Mês/Ano)
   - Verificar se dados são filtrados corretamente
   - Verificar se gráficos atualizam

4. **Filtro por Mês Específico**
   - Selecionar mês específico (ex: Outubro 2025)
   - Verificar se apenas dados desse mês são mostrados

**Componentes a Verificar**:
- `DashboardOverview.tsx`
- `ModernCashflowChart.tsx`
- `RevenueDistributionGauge.tsx`
- `FinancialKPICards.tsx`

---

## Página: Relatórios - DRE

### Filtros a Testar
- [ ] Seleção de empresa única
- [ ] Seleção de múltiplas empresas (consolidação)
- [ ] Filtro por ano (selectedYear)
- [ ] Filtro por mês (selectedMonth)
- [ ] Filtro por período (Ano/Mês)

### Testes
1. **Filtro por Empresa**
   - Selecionar empresa única
   - Verificar se tabela DRE mostra apenas dados dessa empresa
   - Verificar se KPIs (Receita Bruta, Despesas, Lucro) estão corretos

2. **Consolidação de Múltiplas Empresas**
   - Selecionar 2-3 empresas
   - Verificar se dados são somados corretamente
   - Verificar se não há duplicação de contas

3. **Filtro por Período**
   - Selecionar ano 2025
   - Verificar se apenas dados de 2025 são mostrados
   - Selecionar mês específico (ex: Outubro 2025)
   - Verificar se apenas dados desse mês são mostrados

**Componentes a Verificar**:
- `DRESection.tsx`
- `DREPivotTable.tsx`
- `DREWaterfallChart.tsx`
- `DREExportButton.tsx`

---

## Página: Relatórios - DFC

### Filtros a Testar
- [ ] Seleção de empresa única
- [ ] Seleção de múltiplas empresas (consolidação)
- [ ] Filtro por ano (selectedYear)
- [ ] Filtro por mês (selectedMonth)

### Testes
1. **Filtro por Empresa**
   - Selecionar empresa única
   - Verificar se tabela DFC mostra apenas dados dessa empresa
   - Verificar se KPIs (Entradas, Saídas, Saldo) estão corretos

2. **Consolidação de Múltiplas Empresas**
   - Selecionar 2-3 empresas
   - Verificar se entradas/saídas são somadas corretamente
   - Verificar se saldo líquido está correto

3. **Filtro por Período**
   - Selecionar ano 2025
   - Verificar se apenas dados de 2025 são mostrados
   - Selecionar mês específico
   - Verificar se apenas dados desse mês são mostrados

**Componentes a Verificar**:
- `DFCSection.tsx`
- `DFCPivotTable.tsx`
- `CashflowSankeyChart.tsx`
- `DFCExportButton.tsx`

---

## Página: Relatórios - Bancos

### Filtros a Testar
- [ ] Seleção de empresa única
- [ ] Seleção de múltiplas empresas
- [ ] Filtro por período (data início/fim)

### Testes
1. **Filtro por Empresa**
   - Selecionar empresa única
   - Verificar se contas bancárias mostradas são apenas dessa empresa
   - Verificar se transações são apenas dessa empresa

2. **Múltiplas Empresas**
   - Selecionar 2-3 empresas
   - Verificar se contas de todas empresas são mostradas
   - Verificar se transações são filtradas corretamente

**Componentes a Verificar**:
- `BanksSection.tsx`

---

## Página: Análises

### Filtros a Testar
- [ ] Seleção de empresa única
- [ ] Seleção de múltiplas empresas
- [ ] Filtro por período

### Testes
1. **Filtro por Empresa**
   - Selecionar empresa única
   - Verificar se gráficos ABC/Pareto mostram apenas dados dessa empresa

2. **Múltiplas Empresas**
   - Selecionar 2-3 empresas
   - Verificar se gráficos consolidam dados corretamente

**Componentes a Verificar**:
- `AnaliticoDashboard.tsx`
- `ABCParetoChart.tsx`
- `ClientesAnaliseChart.tsx`

---

## Validações Gerais

### Consolidação
- [ ] Soma de dados individuais = Total consolidado
- [ ] Não há duplicação de registros na consolidação
- [ ] KPIs consolidados estão corretos

### Filtros de Período
- [ ] Dados fora do período não são mostrados
- [ ] Alteração de período atualiza todos os componentes
- [ ] Filtro por mês específico funciona corretamente

### Performance
- [ ] Filtros não causam lentidão excessiva
- [ ] Dados são carregados apenas quando necessário
- [ ] Cache é invalidado quando filtros mudam

---

## Como Executar os Testes

1. Abrir aplicação no navegador
2. Fazer login com `alceu@angra.io`
3. Verificar se 13 empresas Volpe estão disponíveis
4. Executar cada teste do checklist acima
5. Documentar problemas encontrados
6. Corrigir problemas e re-testar

---

## Scripts de Teste Automatizado

Os seguintes scripts podem ser executados para validar dados:

```bash
# Teste de integridade
node scripts/tests/test_data_integrity.mjs

# Teste de duplicatas
node scripts/tests/test_no_duplicates.mjs

# Teste de consistência de filtros
node scripts/tests/test_filter_consistency.mjs

# Teste de consolidação
node scripts/tests/test_consolidation.mjs
```

---

## Problemas Conhecidos

- Schema cache do Supabase em scripts Node.js (resolvido usando MCP)
- Tabela `cashflow_entries` vs `dfc_entries` (corrigido para usar `dfc_entries`)
- Filtros de período não aplicados em `getDRE` e `getDFC` (corrigido)

---

## Notas

- Todos os filtros devem respeitar `selectedCompanies` de `App.tsx`
- Consolidação deve somar valores, não concatenar registros
- Filtros de período devem usar `selectedYear` e `selectedMonth`
- Componentes devem atualizar quando filtros mudam (useEffect dependencies)

