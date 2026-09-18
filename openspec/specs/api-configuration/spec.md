# api-configuration Specification

## Purpose

Garantir que a API só inicie com uma configuração válida e explícita, falhando cedo e de forma legível quando algo estiver errado, e que o caminho do banco não dependa de onde o processo é executado.

## Requirements

### Requirement: Variáveis de ambiente suportadas
A API SHALL ler as variáveis `NODE_ENV` (`development`, `test` ou `production`; padrão `development`), `PORT` (inteiro de 1 a 65535; padrão `3000`), `DATABASE_PATH` (texto não vazio; padrão `./data/app.db`) e `LOG_LEVEL` (`fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent`; padrão `info`). Variáveis ausentes SHALL assumir o valor padrão.

#### Scenario: Sem nenhuma variável definida
- **WHEN** a configuração é carregada de um ambiente sem nenhuma dessas variáveis
- **THEN** o resultado é `NODE_ENV=development`, `PORT=3000`, `DATABASE_PATH=./data/app.db` e `LOG_LEVEL=info`

#### Scenario: Valores informados
- **WHEN** o ambiente define `PORT=4000`, `LOG_LEVEL=debug` e `NODE_ENV=production`
- **THEN** a configuração reflete esses valores, com os padrões para as demais

### Requirement: Falha rápida com configuração inválida
Com qualquer variável inválida, a API SHALL recusar-se a iniciar: encerrar com código de saída diferente de zero **antes** de abrir o banco ou aceitar conexões, exibindo uma mensagem que nomeia cada variável inválida e o motivo, sem stack trace.

#### Scenario: Porta inválida
- **WHEN** a API é iniciada com `PORT=abc`
- **THEN** o processo encerra com código diferente de zero, a mensagem menciona `PORT`, e nenhum arquivo de banco é criado

#### Scenario: Porta fora do intervalo
- **WHEN** a API é iniciada com `PORT=70000`
- **THEN** o processo encerra com código diferente de zero mencionando `PORT`

#### Scenario: Várias variáveis inválidas
- **WHEN** a API é iniciada com `PORT=abc` e `LOG_LEVEL=verbose`
- **THEN** a mensagem de erro lista `PORT` e `LOG_LEVEL`, cada uma com seu motivo

### Requirement: Arquivo .env opcional
Se existir um arquivo `.env` na raiz do repositório, a API SHALL carregar seus valores como variáveis de ambiente, sem sobrescrever variáveis já definidas no ambiente do processo. A ausência do arquivo SHALL NOT ser um erro.

#### Scenario: Valor vindo do .env
- **WHEN** o `.env` define `PORT=4100` e o ambiente não define `PORT`
- **THEN** a API escuta na porta 4100

#### Scenario: Ambiente tem precedência
- **WHEN** o `.env` define `PORT=4100` e o ambiente do processo define `PORT=4200`
- **THEN** a API escuta na porta 4200

#### Scenario: Sem arquivo .env
- **WHEN** não existe `.env` na raiz
- **THEN** a API inicia normalmente com as variáveis do ambiente e os padrões

### Requirement: Caminho do banco independente do diretório de trabalho
Um `DATABASE_PATH` relativo SHALL ser resolvido a partir da raiz do repositório, e não do diretório de trabalho do processo. Um caminho absoluto SHALL ser respeitado e o valor especial `:memory:` SHALL indicar um banco em memória. Se o diretório do arquivo de banco não existir, a API SHALL criá-lo.

#### Scenario: Mesmo arquivo de qualquer diretório
- **WHEN** a API é iniciada uma vez a partir da raiz do repositório e outra a partir de `apps/api`, ambas com o `DATABASE_PATH` padrão
- **THEN** as duas usam o mesmo arquivo `data/app.db` na raiz do repositório

#### Scenario: Diretório do banco inexistente
- **WHEN** `DATABASE_PATH` aponta para um arquivo dentro de um diretório que ainda não existe
- **THEN** o diretório é criado e o banco é aberto normalmente
