# Spec Delta

## Purpose

Tornar cada requisição rastreável por um identificador e registrar seu resultado em logs estruturados, sem nunca expor dados sensíveis, para permitir diagnóstico em produção.

## ADDED Requirements

### Requirement: Identificador de requisição
Toda resposta da API SHALL incluir o cabeçalho `X-Request-Id`. Se o cliente enviar um `X-Request-Id` com 1 a 64 caracteres `A-Z`, `a-z`, `0-9`, `_` ou `-`, o valor SHALL ser reaproveitado; caso contrário (ausente ou fora desse formato), a API SHALL gerar um UUID. O mesmo identificador SHALL constar em todas as entradas de log daquela requisição.

#### Scenario: Identificador gerado
- **WHEN** um cliente faz uma requisição sem `X-Request-Id`
- **THEN** a resposta traz `X-Request-Id` com um UUID

#### Scenario: Identificador do cliente aproveitado
- **WHEN** um cliente envia `X-Request-Id: client-123`
- **THEN** a resposta traz `X-Request-Id: client-123`

#### Scenario: Identificador inválido substituído
- **WHEN** um cliente envia `X-Request-Id` com espaços ou caracteres especiais
- **THEN** a resposta traz um UUID gerado, e o valor enviado não aparece nos logs

### Requirement: Log estruturado por requisição
Ao concluir cada requisição, a API SHALL registrar uma linha de log em JSON com o identificador da requisição, o método, a URL, o status da resposta e o tempo de resposta. O nível SHALL ser `info` para status abaixo de 400, `warn` para 4xx e `error` para 5xx.

#### Scenario: Requisição bem-sucedida
- **WHEN** um cliente faz `GET /api/products` e recebe `200`
- **THEN** existe uma linha de log JSON de nível `info` com o `id` da requisição, `GET`, a URL, `statusCode` 200 e `responseTime`

#### Scenario: Erro de cliente
- **WHEN** um cliente recebe `400`
- **THEN** a linha de log correspondente tem nível `warn`

#### Scenario: Erro de servidor
- **WHEN** a API responde `500`
- **THEN** a linha de log correspondente tem nível `error`

### Requirement: Logs sem dados sensíveis
Os logs SHALL conter somente campos previamente permitidos (identificador, método, URL, status e tempo). Cabeçalhos de requisição ou resposta (como `Authorization` e `Cookie`) e corpos de requisição ou resposta SHALL NOT ser registrados.

#### Scenario: Cabeçalhos sensíveis
- **WHEN** um cliente faz uma requisição com `Authorization: Bearer segredo` e `Cookie: session=abc`
- **THEN** nenhuma linha de log contém `segredo` nem `session=abc`

### Requirement: Registro completo de erros inesperados
Quando uma requisição termina em `INTERNAL_ERROR`, a API SHALL registrar o erro original (mensagem e stack) em nível `error`, com o identificador da requisição, sem incluí-lo na resposta.

#### Scenario: Erro registrado com o identificador
- **WHEN** uma requisição falha por um erro inesperado
- **THEN** o log contém uma entrada de nível `error` com a mensagem e a stack do erro e o mesmo `X-Request-Id` da resposta

### Requirement: Nível de log configurável
O nível mínimo de log SHALL seguir `LOG_LEVEL`. Com `LOG_LEVEL=silent`, a API SHALL NOT escrever logs.

#### Scenario: Log silenciado
- **WHEN** a API roda com `LOG_LEVEL=silent` e atende uma requisição
- **THEN** nada é escrito nos logs
