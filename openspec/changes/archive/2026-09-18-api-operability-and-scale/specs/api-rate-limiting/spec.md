# Spec Delta

## Purpose

Proteger a API contra excesso de requisições de um mesmo cliente, respondendo de forma padronizada e informando quando tentar novamente, sem afetar a verificação de saúde.

## ADDED Requirements

### Requirement: Limite de requisições por cliente
As rotas sob `/api` SHALL aceitar no máximo `RATE_LIMIT_MAX` requisições por cliente dentro de cada janela de `RATE_LIMIT_WINDOW_MS` milissegundos (padrões: 100 por 60 000 ms). O cliente é identificado pelo endereço IP. Toda resposta sob `/api` SHALL incluir os cabeçalhos padrão `RateLimit` e `RateLimit-Policy`. Ao exceder o limite, a API SHALL responder `429` com o código `RATE_LIMITED` no envelope de erro padronizado e o cabeçalho `Retry-After` (segundos inteiros até o fim da janela), sem executar a operação solicitada. Ao término da janela, o cliente SHALL voltar a ser atendido normalmente.

#### Scenario: Dentro do limite
- **WHEN** um cliente faz requisições em número menor ou igual ao limite
- **THEN** todas são atendidas normalmente e trazem `RateLimit` e `RateLimit-Policy`

#### Scenario: Limite excedido
- **WHEN** um cliente faz uma requisição além do limite da janela
- **THEN** a resposta é `429` com `error.code` igual a `RATE_LIMITED`, cabeçalho `Retry-After` maior que zero e nenhuma alteração de dados, mesmo para `POST`

#### Scenario: Nova janela
- **WHEN** a janela de limitação termina
- **THEN** o mesmo cliente volta a receber respostas normais

#### Scenario: Clientes contados separadamente
- **WHEN** dois clientes com IPs diferentes fazem requisições e apenas um excede o limite
- **THEN** somente esse cliente recebe `429`

### Requirement: Escopo do limite
O limite SHALL valer somente para rotas sob `/api` (incluindo rotas inexistentes sob `/api`). `GET /health` e demais caminhos fora de `/api` SHALL NOT ser contados nem bloqueados.

#### Scenario: Saúde não é limitada
- **WHEN** um cliente já bloqueado em `/api` faz `GET /health`
- **THEN** a resposta não é `429`

### Requirement: Identificação do cliente atrás de proxy
Por padrão (`TRUST_PROXY=0`), a API SHALL ignorar o cabeçalho `X-Forwarded-For`, de modo que um cliente não escape do limite variando esse cabeçalho. Com `TRUST_PROXY` igual a N maior que zero, a API SHALL confiar em N proxies e usar o IP indicado por eles.

#### Scenario: Cabeçalho forjado é ignorado por padrão
- **WHEN** um cliente esgota o limite e continua enviando `X-Forwarded-For` com valores diferentes a cada requisição
- **THEN** as requisições seguintes continuam recebendo `429`

#### Scenario: Confiança em um proxy
- **WHEN** `TRUST_PROXY=1` e dois clientes chegam com `X-Forwarded-For` distintos
- **THEN** cada IP informado pelo proxy é contado separadamente
