## Objetivo
Salvar um snapshot completo do estado do projeto sempre que você escrever `ANCORA!` e opcionalmente de forma periódica.

## Conteúdo do Snapshot
- Git (branch, status, diff resumido, últimos commits)
- Terminais ativos e URLs de preview (`http://localhost:3000`)
- Projeto (`package.json`, `vite.config.ts`)
- Ambiente (`.env.local`/`.env.production` com segredos mascarados)
- Sessão do app (`localStorage.session_user` via navegação headless)
- Metadados (timestamp, usuário, nome do projeto)

## Armazenamento
- Diretório `var/snapshots/`
- Arquivo `var/snapshots/<YYYYMMDD-HHmmss>.json`
- Adição de `var/snapshots/` ao `.gitignore`

## Implementação
- Script Node `scripts/snapshot.ts` que coleta e grava o JSON
- Comando npm `npm run snapshot`
- (Opcional) `scripts/restore.ts` para checklist de retomada

## Agente Vigilante (opcional)
- `npm run snapshot:watch` para snapshots automáticos (intervalo e eventos)

## Segurança
- Mascaramento de segredos; sem gravação de chaves privadas
- Snapshot somente local, fora do controle de versão

## Verificação
- Testar `ANCORA!` e confirmar criação e conteúdo do snapshot

Se concorda, avanço para implementar os scripts e comandos.