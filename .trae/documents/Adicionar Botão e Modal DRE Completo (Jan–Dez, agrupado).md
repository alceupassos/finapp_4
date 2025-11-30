## Objetivo
- Adicionar um botão na área indicada (header/nav da página de análises) que abre um modal com o DRE completo do ano, com colunas de janeiro a dezembro e linhas agrupadas conforme o anexo (agrupado.png).

## Local do Botão
- Inserir botão no topo da página de análises, ao lado das abas DRE/DFC/Lançamentos/Gráficos e abaixo do título “Dashboard Financeiro”.
- Ícone/texto: “DRE Completo (Ano)”.
- Comportamento: abre modal em tela cheia com tabela pivot Jan–Dez.

## Novo Componente
- `DREFullModal.tsx` (tela cheia):
  - Cabeçalho: título + CNPJ da Matriz + botão fechar.
  - Corpo: tabela responsiva com 12 colunas (Jan–Dez) e linhas agrupadas por grupos do Plano de Contas.
  - Rodapé: ações (exportar CSV/XLSX, copiar, imprimir).
- Utilizar virtualização (opcional) se a quantidade de linhas for grande.

## Dados e Agrupamento
- Fonte: `SupabaseRest.getDRE(MATRIZ_CNPJ)`.
- Transformação:
  - Mapear natureza/conta → grupo conforme PlanoDeContas.xlsx.
  - Agregar por grupo e mês (sum valor), mantendo sinal contábil correto.
  - Exibir valores como positivos e destacar com cores (verde receita, vermelho despesa) apenas no total mensal.
- Implementar `dreGroupMap` (objeto estático ou JSON) com a hierarquia igual ao anexo (ex.: Receita Operacional, (-) Deduções, Receita Líquida, (-) Custo, Lucro Bruto, Despesas Operacionais...).

## Integração com Período
- Respeitar seleção “Ano” no navibar; quando “Ano” estiver ativo, a tabela mostra Jan–Dez.
- Se “Mês”/“Semana”/“Dia”, o modal pode desabilitar botão ou mostrar aviso de que a visão completa é apenas para “Ano”.

## UI/UX
- Botão: estilo primário discreto, com tooltip “Abrir DRE completo (Ano)”.
- Modal: full-screen, cabeçalho fixo, corpo com scroll e tabela fixa de colunas; legenda com cores de grupo.
- Acessibilidade: fechar com Esc, foco no botão fechar, aria-labels.

## Validação
- Tabela deve refletir apenas CNPJ da Matriz 26888098000159.
- Conferir totais por grupo e por mês com base na planilha DREDFC_VOLPE.xlsx.
- Testar com dados reais do Supabase; se faltar algum grupo, listar no rodapé “Itens não mapeados”.

## Arquivos a alterar/criar
- Criar `src/components/DREFullModal.tsx`.
- Atualizar `src/components/AnalisesPage.tsx` para incluir o botão e controlar estado do modal.
- Opcional: `src/config/planodecontas.json` com o mapa de agrupamento (ou objeto dentro do componente).

## Entregáveis
- Botão funcional no topo da análise.
- Modal com DRE anual Jan–Dez, agrupado conforme o anexo.
- Export CSV/XLSX e impressão.

## Próximos Passos (após aprovação)
1. Criar o componente do modal com tabela.
2. Implementar o `dreGroupMap` baseado no PlanoDeContas.xlsx.
3. Inserir o botão e estado do modal na página de análises.
4. Validar com a Matriz e comparar com o anexo.
5. Rodar preview e ajustar eventuais diferenças de agrupamento.
