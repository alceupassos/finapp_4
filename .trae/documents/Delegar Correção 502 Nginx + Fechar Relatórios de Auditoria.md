## Objetivo
Delegar a correção do 502 (Nginx) para um agente de pesquisa/diagnóstico enquanto finalizo totais DRE/DFC e os arquivos de auditoria, e depois entregar relatórios consolidados.

## Agente (Pesquisa/Diagnóstico Nginx)
- Tarefas do agente (somente leitura/pesquisa):
  - Coletar checklist oficial para 502 em Nginx (upstreams, vhosts, logs, SPA `try_files`).
  - Consolidar configuração de vhost estático SPA para `/var/www/finapp` (HTTPS com Let’s Encrypt) e bloco provisório para `/api`.
  - Montar sequência de validação: `nginx -t`, reload, `curl -I`, inspeção de logs.
- Entregáveis:
  - Bloco de `server` HTTPS pronto para aplicar.
  - Passo a passo de correção (comandos) e checklist de verificação.

## Minha parte (paralelo)
- Fechar consolidação por CNPJ/período (AES + Grupo Volpe):
  - DRE: somatório de lançamentos (receitas +, despesas –).
  - DFC: somatório por `in/out` (valores positivos).
- Gerar snapshots e relatório:
  - `var/snapshots/` com contagens e totais.
  - Tabela consolidada por empresa/período.

## Fluxo de Entrega
1) Agente entrega o plano de correção 502 Nginx (blocos vhost, comandos, validações).
2) Eu aplico a correção, valido `200 OK` e anexo logs.
3) Entrego relatório de auditoria (contagens/totais DRE/DFC por CNPJ) + snapshots.

## Observações
- Nenhuma alteração será feita pelo agente; ele só pesquisa e me entrega os artefatos.
- Eu executo a aplicação dos ajustes quando você confirmar.
