# Spec Delta

## Purpose

Ensure the API only starts with a valid, explicit configuration, failing early and readably when something is wrong, and that the database path does not depend on where the process is run.

## ADDED Requirements

### Requirement: Supported environment variables
The API SHALL read the variables `NODE_ENV` (`development`, `test` or `production`; default `development`), `PORT` (integer from 1 to 65535; default `3000`), `DATABASE_PATH` (non-empty text; default `./data/app.db`) and `LOG_LEVEL` (`fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`; default `info`). Missing variables SHALL take the default value.

#### Scenario: No variable defined
- **WHEN** the configuration is loaded from an environment with none of these variables
- **THEN** the result is `NODE_ENV=development`, `PORT=3000`, `DATABASE_PATH=./data/app.db` and `LOG_LEVEL=info`

#### Scenario: Values provided
- **WHEN** the environment defines `PORT=4000`, `LOG_LEVEL=debug` and `NODE_ENV=production`
- **THEN** the configuration reflects those values, with the defaults for the rest

### Requirement: Fail fast on invalid configuration
With any invalid variable, the API SHALL refuse to start: exit with a non-zero exit code **before** opening the database or accepting connections, showing a message that names each invalid variable and the reason, with no stack trace.

#### Scenario: Invalid port
- **WHEN** the API is started with `PORT=abc`
- **THEN** the process exits with a non-zero code, the message mentions `PORT`, and no database file is created

#### Scenario: Port out of range
- **WHEN** the API is started with `PORT=70000`
- **THEN** the process exits with a non-zero code mentioning `PORT`

#### Scenario: Several invalid variables
- **WHEN** the API is started with `PORT=abc` and `LOG_LEVEL=verbose`
- **THEN** the error message lists `PORT` and `LOG_LEVEL`, each with its reason

### Requirement: Optional .env file
If a `.env` file exists at the repository root, the API SHALL load its values as environment variables, without overwriting variables already defined in the process environment. The absence of the file SHALL NOT be an error.

#### Scenario: Value coming from .env
- **WHEN** the `.env` defines `PORT=4100` and the environment does not define `PORT`
- **THEN** the API listens on port 4100

#### Scenario: Environment takes precedence
- **WHEN** the `.env` defines `PORT=4100` and the process environment defines `PORT=4200`
- **THEN** the API listens on port 4200

#### Scenario: No .env file
- **WHEN** there is no `.env` at the root
- **THEN** the API starts normally with the environment variables and the defaults

### Requirement: Database path independent of the working directory
A relative `DATABASE_PATH` SHALL be resolved from the repository root, not from the process's working directory. An absolute path SHALL be respected and the special value `:memory:` SHALL indicate an in-memory database. If the database file's directory does not exist, the API SHALL create it.

#### Scenario: Same file from any directory
- **WHEN** the API is started once from the repository root and once from `apps/api`, both with the default `DATABASE_PATH`
- **THEN** both use the same `data/app.db` file at the repository root

#### Scenario: Nonexistent database directory
- **WHEN** `DATABASE_PATH` points to a file inside a directory that does not exist yet
- **THEN** the directory is created and the database is opened normally
