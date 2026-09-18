# Proposal

## Why

Com o CRUD completo (T3), a API precisa de proteção e operabilidade para ser considerada pronta para produção e para sustentar a **feature extra** do teste (resiliência e escala): limite de requisições, verificação de saúde, encerramento limpo e a coalescência de leituras concorrentes (singleflight), que é o par de backend do REST client com retry/backoff que virá na T5.

## What Changes

- **Rate limit** em `/api` (`express-rate-limit`), por IP, configurável por ambiente; excedido → `429 RATE_LIMITED` no envelope padrão com `Retry-After`, mais os cabeçalhos `RateLimit`. `trust proxy` configurável.
- **`GET /health`** fora de `/api` e do limite: `200` se o banco responde, `503` se não.
- **Graceful shutdown** em `SIGINT`/`SIGTERM`: para de aceitar conexões, conclui as requisições em andamento (com tempo máximo), fecha o banco e encerra.
- **Singleflight** (`lib/singleflight.ts`) aplicado no service às **leituras** (obter por id e listar), nunca às escritas, sem cache.
- Novas variáveis de ambiente (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `TRUST_PROXY`) e `.env.example` atualizado.
- **Limitação registrada**: com SQLite local a coalescência não tem efeito real em runtime (medido na T1); o componente é testado com carga assíncrona simulada e o README (T8) deve dizer isso.

**Fora de escopo**: trocar de driver, cache, métricas, `helmet`, autenticação, frontend.

## Capabilities

### New Capabilities

- `api-rate-limiting`: limite de requisições por cliente em `/api`, resposta `429` e cabeçalhos.
- `api-health`: endpoint `GET /health`.
- `graceful-shutdown`: encerramento limpo por sinal do sistema.
- `read-coalescing`: coalescência (singleflight) de leituras concorrentes idênticas.

### Modified Capabilities

- `api-configuration`: o requisito "Variáveis de ambiente suportadas" passa a incluir as três novas variáveis.
- `api-error-handling`: o código `RATE_LIMITED` passa a ser emitido (requisito "Códigos e status do contrato").

## Impact

- **Código**: `apps/api/src` (config, `lib`, `middleware`, camadas de health, `app.ts`, `server.ts`, service) e testes. `.env.example`. Sem novas dependências (o `express-rate-limit` já está instalado).
- **Comportamento observável**: a API passa a limitar `/api` (100 requisições por minuto por IP, por padrão), expõe `/health` e encerra de forma limpa com `Ctrl+C`.
- **Riscos**: o limite em memória vale para um único processo; sinais reais não podem ser entregues a um processo filho no Windows (ver `design.md` para como a fiação é verificada).
