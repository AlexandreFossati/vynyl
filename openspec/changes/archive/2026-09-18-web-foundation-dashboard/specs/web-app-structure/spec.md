# Spec Delta

## Purpose

Definir como a SPA é montada e organizada: roteamento, ligação com a API em desenvolvimento e as fronteiras entre os níveis de componentes, para que as próximas telas sigam o mesmo padrão.

## ADDED Requirements

### Requirement: Roteamento mínimo
A SPA SHALL escolher a página pelo caminho da URL usando a History API: `/` mostra o dashboard e qualquer outro caminho mostra a página de não encontrado, com um link de volta a `/`. A navegação interna SHALL ocorrer sem recarregar a página e SHALL responder aos botões voltar e avançar do navegador.

#### Scenario: Rota conhecida
- **WHEN** o usuário abre `/`
- **THEN** o dashboard é exibido

#### Scenario: Rota desconhecida
- **WHEN** o usuário abre `/nao-existe`
- **THEN** a página de não encontrado é exibida com um link para `/`

#### Scenario: Navegação sem recarregar
- **WHEN** o usuário aciona o link "Back to products" na página de não encontrado
- **THEN** o dashboard aparece, a URL passa a ser `/` e a página não é recarregada

#### Scenario: Voltar do navegador
- **WHEN** o usuário volta no histórico do navegador
- **THEN** a página correspondente ao caminho anterior é exibida

### Requirement: Proxy de desenvolvimento
O servidor de desenvolvimento do Vite SHALL encaminhar as requisições de `/api` para a API local, para que a SPA use caminhos relativos e não precise de CORS.

#### Scenario: Requisição em desenvolvimento
- **WHEN** a SPA em execução no Vite pede `/api/products` e a API está no ar em `localhost:3000`
- **THEN** a resposta da API chega à SPA

### Requirement: Fronteiras dos níveis de componentes
Os componentes SHALL ficar em `atoms`, `molecules`, `organisms`, `templates` e `pages`, com dependências apenas para baixo (página → template → organismo → molécula → átomo). Somente componentes em `pages` SHALL importar de `lib/api`, o que SHALL ser imposto por uma regra de lint. Átomos, moléculas, organismos e templates recebem dados e callbacks por props.

#### Scenario: Importação proibida
- **WHEN** um componente em `atoms`, `molecules`, `organisms` ou `templates` importa de `lib/api`
- **THEN** o lint falha

#### Scenario: Importação permitida
- **WHEN** um componente em `pages` importa de `lib/api`
- **THEN** o lint passa
