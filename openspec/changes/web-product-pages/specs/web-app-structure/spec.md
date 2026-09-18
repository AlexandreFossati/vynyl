# Spec Delta

## MODIFIED Requirements

### Requirement: Roteamento mínimo
A SPA SHALL escolher a página pelo caminho da URL usando a History API: `/` mostra o dashboard, `/products/new` a criação, `/products/:id` o detalhe e `/products/:id/edit` a edição, onde `:id` é um inteiro decimal positivo (apenas dígitos, sem zeros à esquerda). Qualquer outro caminho, inclusive um `:id` inválido, mostra a página de não encontrado, com um link de volta a `/`. A navegação interna SHALL ocorrer sem recarregar a página e SHALL responder aos botões voltar e avançar do navegador.

#### Scenario: Rota conhecida
- **WHEN** o usuário abre `/`
- **THEN** o dashboard é exibido

#### Scenario: Rotas de produto
- **WHEN** o usuário abre `/products/new`, `/products/7` e `/products/7/edit`
- **THEN** são exibidas, respectivamente, a criação, o detalhe e a edição do produto 7

#### Scenario: Rota desconhecida
- **WHEN** o usuário abre `/nao-existe`
- **THEN** a página de não encontrado é exibida com um link para `/`

#### Scenario: Identificador inválido
- **WHEN** o usuário abre `/products/abc`, `/products/0`, `/products/-1`, `/products/1.5` ou `/products/007`
- **THEN** a página de não encontrado é exibida e nenhuma requisição à API é feita

#### Scenario: Navegação sem recarregar
- **WHEN** o usuário aciona o link "Back to products" na página de não encontrado
- **THEN** o dashboard aparece, a URL passa a ser `/` e a página não é recarregada

#### Scenario: Voltar do navegador
- **WHEN** o usuário volta no histórico do navegador
- **THEN** a página correspondente ao caminho anterior é exibida

## ADDED Requirements

### Requirement: Links internos
Os links entre telas SHALL ser âncoras reais (`<a href>`), de modo que funcionem com o teclado e com "abrir em nova aba". Um clique simples (botão principal, sem Ctrl, Cmd, Shift nem Alt) SHALL navegar sem recarregar a página; os demais cliques SHALL manter o comportamento do navegador. A marca do cabeçalho SHALL ser um link para `/`.

#### Scenario: Clique simples
- **WHEN** o usuário clica em um link interno
- **THEN** a SPA navega para o destino sem recarregar a página

#### Scenario: Clique com Ctrl
- **WHEN** o usuário clica em um link interno com Ctrl pressionado
- **THEN** a SPA não intercepta o clique (o navegador abre o destino em outra aba)

#### Scenario: Marca do cabeçalho
- **WHEN** o usuário aciona a marca no cabeçalho
- **THEN** a SPA abre `/`
