# Spec Delta

## MODIFIED Requirements

### Requirement: Variáveis de ambiente suportadas
A API SHALL ler as variáveis `NODE_ENV` (`development`, `test` ou `production`; padrão `development`), `PORT` (inteiro de 1 a 65535; padrão `3000`), `DATABASE_PATH` (texto não vazio; padrão `./data/app.db`), `LOG_LEVEL` (`fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent`; padrão `info`), `RATE_LIMIT_MAX` (inteiro maior ou igual a 1; padrão `100`), `RATE_LIMIT_WINDOW_MS` (inteiro maior ou igual a 1; padrão `60000`) e `TRUST_PROXY` (inteiro de 0 a 32; padrão `0`). Variáveis ausentes SHALL assumir o valor padrão.

#### Scenario: Sem nenhuma variável definida
- **WHEN** a configuração é carregada de um ambiente sem nenhuma dessas variáveis
- **THEN** o resultado é `NODE_ENV=development`, `PORT=3000`, `DATABASE_PATH=./data/app.db`, `LOG_LEVEL=info`, `RATE_LIMIT_MAX=100`, `RATE_LIMIT_WINDOW_MS=60000` e `TRUST_PROXY=0`

#### Scenario: Valores informados
- **WHEN** o ambiente define `PORT=4000`, `LOG_LEVEL=debug`, `NODE_ENV=production`, `RATE_LIMIT_MAX=20`, `RATE_LIMIT_WINDOW_MS=30000` e `TRUST_PROXY=1`
- **THEN** a configuração reflete esses valores, com os padrões para as demais

#### Scenario: Valores inválidos do limite
- **WHEN** o ambiente define `RATE_LIMIT_MAX=0`, `RATE_LIMIT_WINDOW_MS=abc` ou `TRUST_PROXY=99`
- **THEN** a inicialização falha (fail fast) nomeando cada variável inválida
