# Design

## Context

Estado após a T3: CRUD completo, `createApp({ db, logger })`, `server.ts` como raiz de composição, `AppError` + error handler central, 390 testes. Padrões da API aprovados (roadmap). Motivação e escopo: `proposal.md`; requisitos: `specs/`.

Fatos verificados (scratchpad, Node 24, `express-rate-limit` 8):

| Fato | Consequência |
|---|---|
| Com `standardHeaders: 'draft-7'` a lib envia `RateLimit: limit=2, remaining=1, reset=60` e `RateLimit-Policy: 2;w=60`; ao exceder, o `Retry-After: 60` **já está definido** quando o `handler` roda | o handler só precisa delegar ao error handler central; o cabeçalho já vem correto |
| Rota fora do middleware (`/health`) não é contada | montar `/health` antes do limitador, fora de `/api` |
| Sem `trust proxy`, `X-Forwarded-For` é ignorado pela chave (IP do socket) e a lib não escreveu avisos no console | o padrão `TRUST_PROXY=0` é seguro contra falsificação |
| `server.close()` recusa novas conexões e só termina depois das requisições em andamento; com uma requisição pendurada não termina até `closeAllConnections()` | encerramento gracioso + tempo máximo com `closeAllConnections()` |
| No Windows um processo filho não recebe `SIGINT`/`SIGTERM` reais (o `kill` só o termina), mas `process.emit('SIGTERM')` chama os listeners registrados | a fiação dos sinais é verificada no processo real com um gatilho que emite o evento; a entrega do sinal pelo SO não é verificável aqui |

## Goals / Non-Goals

**Goals:** limite de requisições, `/health`, encerramento limpo e singleflight nas leituras, tudo com o padrão de camadas, DI e testes da T2/T3.
**Non-Goals:** cache, métricas, `helmet`, limite distribuído (Redis), autenticação, trocar de driver.

## Decisions

### D1. Ordem do pipeline em `createApp`
`x-powered-by` off → `trust proxy` (config) → request logger → **`/health`** → limitador em **`/api`** → `express.json()` → `/api/products` → 404 → error handler. O `/health` fica depois do logger (é registrado e ganha `X-Request-Id`) e antes do limitador (nunca é bloqueado). `createApp` passa a receber `settings: { rateLimit: { limit, windowMs }, trustProxy }`, além de `db` e `logger`.

### D2. Rate limit (`middleware/rate-limit.ts`)
`createRateLimiter({ limit, windowMs })` embrulha o `express-rate-limit` com `standardHeaders: 'draft-7'`, `legacyHeaders: false`, store em memória por instância do app e `handler` que chama `next(new AppError('RATE_LIMITED', 'Too many requests, please try again later'))`. O envelope, o status 429 e o log em nível `warn` vêm do pipeline existente. **Alternativa**: responder direto no handler da lib (descartada: duplicaria o formato do envelope). **Limitação**: a store em memória vale por processo (uma instância); para várias instâncias seria preciso um store compartilhado.

### D3. Health nas camadas
`repositories/health.repository.ts` (`ping()` com `select 1`), `services/health.service.ts` (`check()`), `handlers/health.handler.ts` e `routes/health.routes.ts`. O handler captura a falha (é a exceção ao padrão "erros sobem para o handler central", porque a resposta 503 não usa o envelope), registra com `req.log.error` e responde `503 { status: 'unavailable' }`; sucesso: `200 { status: 'ok' }`; ambos com `Cache-Control: no-store`.

### D4. Shutdown (`lib/shutdown.ts`)
`createShutdown({ server, closeDatabase, logger, timeoutMs, exit })` devolve `shutdown(signal)`: idempotente (flag), registra o início, arma um timer de forçamento (`unref`) que chama `server.closeAllConnections()`, registra e sai com 1; senão espera `server.close()`, chama `closeDatabase()`, registra o fim e sai com 0; qualquer falha registra e sai com 1. `exit` é injetado (testável sem matar o processo). `registerShutdownSignals(emitter, shutdown)` liga `SIGINT` e `SIGTERM`. O tempo máximo é a constante `SHUTDOWN_TIMEOUT_MS = 10_000` em `server.ts` (não vira variável de ambiente para não ampliar a configuração).

### D5. Singleflight (`lib/singleflight.ts`) e uso no service
`createSingleflight()` devolve `{ do(key, loader) }`: se há execução em andamento para a chave, devolve a mesma promise; senão executa o `loader`, guarda a promise e a **remove ao terminar** (sucesso ou erro) com `promise.then(release, release)` (evita rejeição não tratada e só remove se a chave ainda for a mesma). Sem cache. O service recebe `singleflight` (padrão: uma instância nova por service, sem singleton de módulo) e envolve **apenas** `list` e `get`, com chaves `list:<limit>:<offset>:<q>` e `get:<id>`; `create`, `update` e `remove` nunca passam por ele. O resultado compartilhado é o mesmo objeto (os handlers só o serializam). **Limitação (medida na T1/T2)**: com SQLite local a consulta roda na thread principal e as requisições não se sobrepõem, então em runtime praticamente nada é coalescido; o efeito real exigiria um banco em rede ou worker threads. O componente é testado com carga assíncrona simulada, o código comenta a limitação e o README (T8) deve ser honesto sobre isso.

### D6. Configuração
`RATE_LIMIT_MAX` (int ≥ 1, padrão 100), `RATE_LIMIT_WINDOW_MS` (int ≥ 1, padrão 60000) e `TRUST_PROXY` (int 0–32, padrão 0), com o mesmo padrão de validação dos inteiros e mensagens do `loadConfig`. `.env.example` ganha as três.

### D7. Testes
Mesmo estilo aprovado: singleflight puro com promessas controladas; service com repository *fake* lento; limitador com Supertest e **relógio falso** para a janela (sem esperas reais); health com banco `:memory:` e cliente fechado; shutdown com servidor HTTP real, cliente libsql real e `exit` falso; fiação dos sinais com um emissor falso. Verificação em runtime: limite real com `RATE_LIMIT_MAX` pequeno, `/health`, e shutdown no processo real disparado por `process.emit`.

## Risks / Trade-offs

- **Singleflight sem efeito real hoje** → documentado (D5); não alegar redução de consultas com este banco.
- **Store de rate limit em memória** → só uma instância; aceitável neste escopo.
- **Sinais reais não verificáveis no Windows** → verifico o shutdown completo no processo real via `process.emit` e por testes com servidor real; a entrega do sinal pelo SO fica declarada como não verificada.
- **Testes com relógio falso** → limitados a `Date` e timers; se o Supertest interferir, uso `windowMs` mínimo e avanço controlado.
- **`TRUST_PROXY` mal configurado** permite falsificar IP → padrão 0 e documentação no `.env.example`.

## Migration Plan

Sem alteração de schema. Reversão: reverter o commit.

## Open Questions

Nenhuma.
