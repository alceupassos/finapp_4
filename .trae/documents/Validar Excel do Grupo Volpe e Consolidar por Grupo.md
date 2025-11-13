## Objetivo
- Ler os Excel locais do Grupo Volpe ("DRE e DFC.xlsx" prioritário) e validar DRE/DFC com mapeamento real.
- Gerar relatório de consistência (colunas, amostras, totais, reconciliação DFC) e definir a consolidação por grupo.
- Somente após aprovação, ligar as telas Mapa/DRE/DFC aos dados consolidados.

## Arquivos-Alvo
- `avant/DRE e DFC.xlsx` (principal)
- (se útil para comparação) `avant/E.A.S COMERCIAL.xlsx`, `avant/LUMINI BRASÍLIA.xlsx`.

## Plano de Validação
1. Detectar sheets DRE/DFC
   - DRE: procurar nomes contendo "dre", "resultado"; DFC: "dfc", "fluxo".
2. Mapear colunas
   - DRE: `conta`, `valor`, `competência (mês)`, `empresa/CNPJ` (se presente).
   - DFC: `descricao`, `entrada`, `saida`, `saldo`, `competência (mês)`, `empresa/CNPJ`.
3. Normalizar números BR
   - Remover `R$`, espaços, milhares `.`; trocar `,` por `.`; converter para número.
4. Consolidação mensal
   - DRE: somar `valor` por `conta` e mês.
   - DFC: somar `entrada`, `saida`, `saldo` por mês.
5. Reconciliação DFC
   - Verificar: `saldo_n ≈ saldo_{n-1} + entradas − saídas` (tolerância controlada).
6. Relatório de consistência
   - Colunas detectadas, amostras (5 linhas), totais por mês, discrepâncias (nulos/tipos), sugestões de correção.

## Consolidação por Grupo (sem CNPJ)
- Criar entidade lógica "Grupo Volpe (Consolidado)":
  - DRE: soma de `valor` por `conta` e mês entre empresas do grupo.
  - DFC: soma de `entrada`, `saida`, `saldo` por mês.
  - Textos não numéricos: não duplicar; usar conjunto canônico (nomes de empresas, contas/descrições) e registrar CNPJs fonte.

## Entregáveis
- Relatório de validação (colunas, totais, amostras, reconciliação DFC e discrepâncias).
- Especificação final de mapeamento DRE/DFC e consolidação por grupo.
- Após aprovação: ligação ao front Mapa/DRE/DFC com cache e sem chamadas ao ERP.

## Critérios de Sucesso
- Tabelas mensais consistentes (DRE/DFC) com conversão BR correta.
- Consolidação por grupo auditável e sem duplicação textual.
- Aprovação do relatório para avançar à integração no front.