# Tasks

> Referências: specs em `specs/` (`api-rate-limiting`, `api-health`, `graceful-shutdown`, `read-coalescing` e as modificadas `api-configuration`, `api-error-handling`); decisões em `design.md` (D1–D7); padrões aprovados no `OPENSPEC_TASKS.md`. Idioma: código, comentários e testes em **inglês**; estas tasks em português. Não fazer commit (a orquestração faz depois). **Nenhuma dependência nova.** Temporários de verificação no scratchpad. Testes seguem a Definition of Done do `CLAUDE.md`.

## 1. Configuração

- [x] 1.1 Acrescentar `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` e `TRUST_PROXY` ao `config/env.ts` (D6) e ao `.env.example`, com testes: padrões (100, 60000, 0), valores informados, `RATE_LIMIT_MAX` `0`/`abc`, `RATE_LIMIT_WINDOW_MS` `0`/`abc`, `TRUST_PROXY` `-1`/`99`/`abc`, e a mensagem lista todas as inválidas com o motivo. Verificar com `npm test -w @vynyl/api`.

## 2. Singleflight

- [x] 2.1 Criar `apps/api/src/lib/singleflight.ts` (D5) com testes usando promessas controladas: N chamadas simultâneas com a mesma chave executam o `loader` uma vez e recebem o mesmo resultado; chaves diferentes executam cada uma; após terminar, nova chamada executa de novo (sem cache); erro compartilhado por todos e chave liberada (a seguinte executa e pode ter sucesso); `loader` que lança de forma síncrona vira rejeição e libera a chave; sem rejeição não tratada. Verificar com os testes do `api`.
- [x] 2.2 Injetar `singleflight` no service e envolver só `list` e `get` (D5), com testes usando repository fake lento: 5 `list` idênticos simultâneos chamam o repository uma vez; `list` com `q`, `limit` ou `offset` diferentes e `get` com `id` diferentes não colapsam; `get` simultâneo coalesce; duas `create` simultâneas chamam o repository duas vezes, e `update`/`remove` idem; falha do repository chega a todos e a próxima chamada tenta de novo; os testes existentes seguem passando. Verificar com os testes do `api` e o `typecheck`.

## 3. Rate limit

- [x] 3.1 Criar `apps/api/src/middleware/rate-limit.ts` (D2) e ligar em `createApp` com `settings` (D1), com testes via Supertest e relógio falso: dentro do limite as respostas trazem `RateLimit` e `RateLimit-Policy`; ao exceder, `429` com o envelope `RATE_LIMITED`, `Retry-After` inteiro > 0 e a operação não executa (um `POST` bloqueado não cria produto); após avançar a janela o cliente volta a ser atendido; rotas inexistentes sob `/api` contam; `X-Forwarded-For` variável é ignorado por padrão (continua `429`); com `TRUST_PROXY=1` IPs distintos são contados separadamente. Verificar com os testes do `api`.

## 4. Health

- [x] 4.1 Criar as camadas de health (`repositories/health.repository.ts`, `services/health.service.ts`, `handlers/health.handler.ts`, `routes/health.routes.ts`) e montar `/health` antes do limitador (D1, D3), com testes: `200 {status:'ok'}` com `Cache-Control: no-store`; `503 {status:'unavailable'}` com o `client` fechado, sem texto do erro no corpo e com o erro no log e o mesmo `X-Request-Id`; `/health` continua respondendo enquanto `/api` está bloqueado pelo limite; `POST /health` responde `404`. Verificar com os testes do `api`.

## 5. Shutdown

- [x] 5.1 Criar `apps/api/src/lib/shutdown.ts` (`createShutdown`, `registerShutdownSignals`, D4) com testes usando servidor HTTP real, cliente libsql real e `exit` falso: requisição lenta em andamento termina com a resposta completa e só então o banco fecha e `exit(0)`; nova conexão após o início é recusada; servidor ocioso sai rápido com 0; requisição que nunca termina + relógio falso de `setTimeout` avançado além do tempo máximo → `closeAllConnections`, log de forçamento e `exit(1)`; segunda chamada ignorada; falha ao fechar registra e sai com 1; um emissor falso emite `SIGINT` e `SIGTERM` e cada um dispara o `shutdown` (uma só vez). Verificar com os testes do `api`.
- [x] 5.2 Ligar tudo no `apps/api/src/server.ts`: passar `settings` a `createApp` (config), guardar `client`, criar o `shutdown` com `SHUTDOWN_TIMEOUT_MS = 10_000` e registrar `SIGINT`/`SIGTERM`. Verificar com `npm run typecheck`, `npm run lint` e `npm test`.

## 6. Verificação em runtime

- [x] 6.1 Com o servidor real (`tsx`, banco temporário, `RATE_LIMIT_MAX=5`, `RATE_LIMIT_WINDOW_MS=4000`): 5 requisições `200` com cabeçalhos `RateLimit`, a 6ª `429` `RATE_LIMITED` com `Retry-After`, `/health` `200` durante o bloqueio, e depois da janela `200` de novo; `X-Forwarded-For` variável não escapa do limite; padrões (sem variáveis) mostram `RateLimit-Policy: 100;w=60`. Repetir o essencial com o bundle.
- [x] 6.2 Shutdown no processo real: iniciar o servidor com um gatilho que emite `process.emit('SIGTERM')` (`node --import <gatilho> dist/server.js`, no scratchpad) enquanto uma requisição está em andamento; verificar que a resposta chega, os logs registram início e fim, a porta fica livre e o código de saída é 0; repetir com `SIGINT`. Declarar que a entrega do sinal pelo SO no Windows não foi verificada.

## 7. Fechamento

- [x] 7.1 Executar na raiz `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run format` (duas vezes, idempotente); conferir o escopo (`package.json`/lockfile sem alteração, sem `console.*`/TODO, sem cache nem código de frontend, sem temporários); `openspec validate api-operability-and-scale --strict`; refletir no `OPENSPEC_TASKS.md` só os itens de escopo e de aceite da T4 realmente verificados; entregar o relatório com o que **não** foi verificado.
