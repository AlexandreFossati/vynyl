# Spec Delta

## Purpose

Fazer o mesmo servidor entregar a SPA compilada e a API, para que a aplicação inteira rode em uma única porta, sem passos manuais, e as rotas do cliente funcionem ao recarregar ou abrir por link.

## ADDED Requirements

### Requirement: Arquivos da SPA compilada
Quando a SPA está compilada (`apps/web/dist/index.html` existe), o servidor SHALL servir os arquivos de `apps/web/dist` na raiz do site. Um arquivo que não existe (caminho com extensão) SHALL receber `404` com o código `NOT_FOUND` no envelope padronizado, e não o `index.html`. Nenhum arquivo fora de `apps/web/dist` SHALL ser acessível por caminhos com `..`.

#### Scenario: Arquivo existente
- **WHEN** um cliente faz `GET /assets/<arquivo>` de um arquivo que está em `apps/web/dist/assets`
- **THEN** a resposta é `200` com o conteúdo do arquivo

#### Scenario: Arquivo inexistente
- **WHEN** um cliente faz `GET /assets/nao-existe.js`
- **THEN** a resposta é `404` com `error.code` igual a `NOT_FOUND`

#### Scenario: Fuga do diretório
- **WHEN** um cliente pede um arquivo fora de `apps/web/dist` com `..` (inclusive codificado, como `%2e%2e`)
- **THEN** o conteúdo desse arquivo não é entregue

### Requirement: Fallback para as rotas da SPA
Quando a SPA está compilada, um `GET` ou `HEAD` para um caminho sem extensão que não comece por `/api` nem por `/health` SHALL receber o `index.html` com `200` e `Content-Type` HTML, para que as rotas do cliente (`/`, `/products/new`, `/products/7`, `/products/7/edit`, ou um caminho desconhecido que a SPA mostra como "não encontrado") funcionem ao abrir por link ou recarregar. Outros métodos nesses caminhos SHALL receber `404` `NOT_FOUND`.

#### Scenario: Página inicial
- **WHEN** um cliente faz `GET /`
- **THEN** a resposta é `200` com o `index.html` da SPA

#### Scenario: Rota do cliente
- **WHEN** um cliente faz `GET /products/7/edit`
- **THEN** a resposta é `200` com o mesmo `index.html`

#### Scenario: Escrita fora da API
- **WHEN** um cliente faz `POST /products/7`
- **THEN** a resposta é `404` com `error.code` igual a `NOT_FOUND`

### Requirement: API e health não são afetados
Os caminhos sob `/api` e o `/health` SHALL continuar respondendo exatamente como sem a SPA: as rotas existentes normalmente e qualquer caminho desconhecido sob `/api` com `404` `NOT_FOUND` em JSON, nunca com o `index.html`. Os estáticos e o fallback SHALL NOT contar no limite de requisições da API.

#### Scenario: Rota desconhecida sob a API
- **WHEN** um cliente faz `GET /api/does-not-exist` com a SPA compilada
- **THEN** a resposta é `404` com `error.code` igual a `NOT_FOUND`, em JSON

#### Scenario: Rotas da API e health
- **WHEN** um cliente faz `GET /api/products` e `GET /health` com a SPA compilada
- **THEN** as respostas são as mesmas de antes (lista de produtos em JSON e `200` de saúde)

### Requirement: Sem SPA compilada, só a API
Se `apps/web/dist/index.html` não existe na inicialização, o servidor SHALL subir normalmente apenas com a API, SHALL registrar um aviso no log dizendo que a SPA não foi encontrada e SHALL responder `404` `NOT_FOUND` aos caminhos fora da API.

#### Scenario: Servidor sem build da SPA
- **WHEN** o servidor sobe sem `apps/web/dist/index.html`
- **THEN** ele fica no ar, registra o aviso e `GET /` responde `404` `NOT_FOUND`
