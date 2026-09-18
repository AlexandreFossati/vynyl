# Spec Delta

## ADDED Requirements

### Requirement: Acesso ao detalhe e à criação
Cada produto da lista SHALL ter seu título como link para `/products/:id`, tanto nos cartões quanto na tabela. O dashboard SHALL oferecer o link "Add product" para `/products/new`, visível em todas as larguras e também quando o catálogo está vazio ou a busca não encontra nada.

#### Scenario: Título leva ao detalhe
- **WHEN** o usuário aciona o título de um produto na lista
- **THEN** a SPA abre o detalhe desse produto

#### Scenario: Adicionar produto
- **WHEN** o usuário aciona "Add product"
- **THEN** a SPA abre `/products/new`

#### Scenario: Catálogo vazio
- **WHEN** o catálogo está vazio ou a busca não encontrou nada
- **THEN** o link "Add product" continua visível
