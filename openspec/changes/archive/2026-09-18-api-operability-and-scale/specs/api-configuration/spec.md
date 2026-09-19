# Spec Delta

## MODIFIED Requirements

### Requirement: Supported environment variables
The API SHALL read the variables `NODE_ENV` (`development`, `test` or `production`; default `development`), `PORT` (integer from 1 to 65535; default `3000`), `DATABASE_PATH` (non-empty text; default `./data/app.db`), `LOG_LEVEL` (`fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`; default `info`), `RATE_LIMIT_MAX` (integer greater than or equal to 1; default `100`), `RATE_LIMIT_WINDOW_MS` (integer greater than or equal to 1; default `60000`) and `TRUST_PROXY` (integer from 0 to 32; default `0`). Missing variables SHALL take the default value.

#### Scenario: No variable defined
- **WHEN** the configuration is loaded from an environment with none of these variables
- **THEN** the result is `NODE_ENV=development`, `PORT=3000`, `DATABASE_PATH=./data/app.db`, `LOG_LEVEL=info`, `RATE_LIMIT_MAX=100`, `RATE_LIMIT_WINDOW_MS=60000` and `TRUST_PROXY=0`

#### Scenario: Values provided
- **WHEN** the environment defines `PORT=4000`, `LOG_LEVEL=debug`, `NODE_ENV=production`, `RATE_LIMIT_MAX=20`, `RATE_LIMIT_WINDOW_MS=30000` and `TRUST_PROXY=1`
- **THEN** the configuration reflects those values, with the defaults for the rest

#### Scenario: Invalid rate limit values
- **WHEN** the environment defines `RATE_LIMIT_MAX=0`, `RATE_LIMIT_WINDOW_MS=abc` or `TRUST_PROXY=99`
- **THEN** startup fails (fail fast) naming each invalid variable
