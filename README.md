# fin.app — Dashboard (pixel parity)
Projeto em **Vite + React + TypeScript + Tailwind** com layout fiel às imagens, importador **DRE/DFC** e widgets equivalentes.

## Rodar
```bash
pnpm i   # ou npm i
pnpm dev # http://localhost:3000
```

## Estrutura
- `src/components/Sidebar.tsx` — nave lateral com logo fin.app
- `src/components/Topbar.tsx` — busca e importador (ícone de engrenagem opcional)
- `src/components/KpiCard.tsx` — cards KPI
- `src/components/CashflowChart.tsx` — gráfico área
- `src/components/VisaCard.tsx` — cartão VISA teal
- `src/components/RecentTransactions.tsx` — lista semanal
- `src/components/StatisticsGauge.tsx` — gauge circular
- `src/components/DRETable.tsx` — tabela DRE
- `src/components/FiltroAvancado.tsx`, `ConciliationWizard.tsx`
- `public/dados/dre.json` e `public/dados/dfc.json` (gerados do seu Excel ou mock)

---
## Variação com **shadcn/ui**
- Pastas: `src/components/ui/*` (button, card, input, badge, dropdown, progress, separator, avatar, label) + `src/lib/utils.ts`.
- Refatorei **Sidebar, Topbar, KPI, Cards, DRE, Gauge** para usar os componentes shadcn (tons, bordas e raio iguais às imagens).
- Deps adicionadas: `class-variance-authority` e `tailwind-merge`.

### Instalação
```bash
pnpm i
pnpm dev
```

### Extras adicionados
- **Radix**: DropdownMenu e Tooltip (menu de ações “...” em KPIs e seletor de período).
- **Toasts**: `sonner` com `<Toaster />` (import, filtros, conciliação).
- **Forms**: `react-hook-form` + `zod` no Filtro Avançado com validação de CNPJ.
- **Período**: seletor Semanal/Mensal/Anual no gráfico e transações (escopo visual + filtro simples).


### Variações Ultra
- **Radix Select** para período (Semanal/Mensal/Anual)
- Menus de ação nos cards (Transações, VISA)
- Importador com validação e toasts de erro
