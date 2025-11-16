# Starter Kit • Next.js + React + MCP + Design System

## Objetivo
Criar um kit inicial completo para sistemas financeiros com execução de código via MCP, Next.js/React, design tokens e UI pronta com Tailwind, shadcn/ui, Tremor e Recharts.

## Principais Dependências
- next, react, react-dom
- @modelcontextprotocol/sdk, @modelcontextprotocol/client
- tailwindcss, postcss, autoprefixer
- @tremor/react
- recharts
- shadcn/ui (cli), class-variance-authority, tailwind-merge, lucide-react, @radix-ui/react-icons
- zod, yargs, pino

## Estrutura Recomendada
- app/ (Next.js App Router)
- components/ (cards, ui)
- lib/ (mcp runner, server tools)
- styles/ (globals, variables.css)
- tailwind.config.ts, postcss.config.js

## Setup
1. Criar o projeto
- npx create-next-app@latest fin-starter --ts --eslint --src-dir --app --import-alias "@/*"
2. Tailwind
- npm i -D tailwindcss postcss autoprefixer
- npx tailwindcss init -p
- tailwind.config.ts
```
import type { Config } from 'tailwindcss'
const config: Config = { content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] }
export default config
```
- globals.css
```
@tailwind base; @tailwind components; @tailwind utilities;
```
3. shadcn/ui
- npx shadcn-ui@latest init
- npm i class-variance-authority tailwind-merge lucide-react @radix-ui/react-icons
4. Tremor e Recharts
- npm i @tremor/react recharts
5. MCP
- npm i @modelcontextprotocol/sdk @modelcontextprotocol/client pino zod

## Execução de Código via MCP
- lib/mcp/runner.ts
```
import { z } from 'zod'
import { createClient } from '@modelcontextprotocol/client'
export const schema = z.object({ action: z.string(), params: z.record(z.any()) })
export async function runMcpTask(input: unknown){ const data = schema.parse(input); const client = await createClient(); const res = await client.callTool({ name: data.action, arguments: data.params }); return res }
```
- app/api/exec/route.ts
```
import { NextResponse } from 'next/server'
import { runMcpTask } from '@/lib/mcp/runner'
export async function POST(req: Request){ const body = await req.json(); const out = await runMcpTask(body); return NextResponse.json(out) }
```

## Design Tokens
- styles/variables.css (copiar de starter-kit/src/design/variables.css)
- Usar tokens via `var(--color-...)` nas camadas Tailwind/shadcn/ui/Tremor
- Paletas adicionais:
  - `starter-kit/src/design/palettes/angrarh.json`
  - `starter-kit/src/design/variables-angrarh.css`
  - Para usar a paleta AngraRH, importe `variables-angrarh.css` em `app/layout.tsx` no lugar de `variables.css`.

## Cards e Componentes
- components/cards/KpiCard.tsx (Tremor)
- components/cards/ChartCard.tsx (Recharts)
- components/cards/ListCard.tsx (Tailwind/shadcn/ui)

## Página de Exemplo
- app/page.tsx monta cards com dados reais (props/API) ou mock

## Logs e Execução
- yargs/pino para CLI
- Rota /api/exec para acionar ferramentas MCP

## Como usar este Starter Kit
- Copiar pasta `starter-kit/templates/nextjs` para o novo projeto
- Instalar dependências listadas
- Ajustar tailwind.config.ts e globals
- Registrar tokens de design e importar `variables.css` em `app/layout.tsx`
- Consumir componentes de cards e a rota `/api/exec`

## Conteúdo incluso
- templates/nextjs/app, components/cards, styles, configs
- tokens e variables
- runner MCP e rota de execução
