## Objetivo

Criar um agente que gere uma pasta “starter kit” com:

* Modelo básico de **método de execução de código** (runner/tarefas, CLI/API)

* **Schema de cores** (design tokens) e estilos

* **Dependências** padronizadas para reuso em outro projeto
  E prosseguir em paralelo com os entregáveis (relatórios DRE/DFC e fix Nginx).

## Estrutura da Pasta (sem executar agora)

* `starter-kit/`

  * `package.json` (scripts e dependências)

  * `README.md` (guia de uso)

  * `src/`

    * `runner/`

      * `Task.ts` (interface)

      * `CodeRunner.ts` (execução segura; timeout, logs)

      * `index.ts` (CLI/API export)

    * `utils/`

      * `env.ts` (carregar env; segredos apenas via process.env)

      * `logger.ts` (structured logs)

    * `design/`

      * `tokens.json` (cores/espacamentos/tipografia)

      * `variables.css` (CSS vars geradas dos tokens)

      * `tailwind.config.js` (se usar Tailwind)

  * `bin/`

    * `run-task.mjs` (CLI simples: `node bin/run-task.mjs --task <nome> --args ...`)

  * `examples/`

    * `example-task.ts` (tarefa de demonstração)

## Método de Execução de Código

* **Runner Pattern**:

  * `Task` descreve entrada/saída e políticas (timeout, memória, sandbox por processo)

  * `CodeRunner` executa em child process (Node `child_process.spawn`) com:

    * Timeout/abort

    * Captura de stdout/stderr

    * Logs estruturados

    * Modo dry‑run

* **CLI**:

  * `npm run run:task -- --task example --args '{"x":1}'`

* **API**:

  * `import { runTask } from './src/runner'`

## Schema de Cores (Design Tokens)

* `tokens.json`:

  * `color.brand`: `#0EA5E9` (primary), `#F59E0B` (accent);

  * `color.ui`: `bg`, `surface`, `border`, `muted`

  * `color.semantic`: `success`, `warning`, `danger`, `info`

  * `typography`: font families, sizes, weights

  * `spacing`: 4, 8, 12, ...

* `variables.css`: expõe tokens como `--color-brand-...` e etc.

* Opcional: Tailwind config mapeando tokens.

## Dependências

* Execução/logs: `zx` (opcional), `pino`, `cross-env`

* Tipos/CLI: `typescript`, `ts-node`, `yargs`

* Estilos: `tailwindcss` (opcional)

* Sem segredos em arquivos: apenas `process.env`

## Padrões e Segurança

* Sem leitura de `.env.local` para segredos; somente `process.env`

* Sanitização de entrada (JSON schema zod opcional)

* Logs com máscara para tokens

## Entregáveis Paralelos

* **Relatórios DRE/DFC**: consolidação por CNPJ/período (AES + Grupo Volpe) e snapshots

* **Nginx**: aplicação do vhost SPA e validação `200 OK`

## Execução do Agente

* O agente gera a pasta `starter-kit` com os arquivos acima (scaffold) e scripts de exemplo.

* Após confirmação, aplico a criação real dos arquivos e disponibilizo instruções de uso.

