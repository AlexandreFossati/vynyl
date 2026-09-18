# product-detail Specification

## Purpose
Mostrar todas as informações de um produto em uma tela própria, com os caminhos para editá-lo, excluí-lo e voltar ao catálogo, e tratar com clareza o produto inexistente e as falhas.

## Requirements

### Requirement: Detalhe de um produto
Ao abrir `/products/:id`, a SPA SHALL pedir o produto à API e exibir seu título (como título principal da página), descrição, categoria, marca, SKU, preço, estoque, peso e as datas de criação e de última atualização. A tela SHALL oferecer o link "Back to products" (para `/`), o link "Edit" (para `/products/:id/edit`) e o botão "Delete".

#### Scenario: Produto existente
- **WHEN** o usuário abre `/products/1` e a API devolve o produto 1
- **THEN** a tela mostra todos os campos do produto, o link "Back to products", o link "Edit" apontando para `/products/1/edit` e o botão "Delete"

#### Scenario: Chegada pela lista
- **WHEN** o usuário aciona o título de um produto na lista do dashboard
- **THEN** a SPA abre o detalhe desse produto sem recarregar a página

### Requirement: Estados do detalhe
Enquanto a resposta não chega, a tela SHALL mostrar um indicador de carregamento. Se a requisição falhar, SHALL mostrar uma mensagem de erro anunciada a tecnologias assistivas (`role="alert"`), sem detalhes técnicos, com a ação "Try again", que repete a mesma requisição. Se o produto não existir (`404` `PRODUCT_NOT_FOUND`), SHALL mostrar a mensagem "Product not found" com a ação "Back to products".

#### Scenario: Carregando
- **WHEN** a resposta ainda não chegou
- **THEN** a tela mostra o indicador de carregamento

#### Scenario: Falha e nova tentativa
- **WHEN** a requisição falha e o usuário aciona "Try again"
- **THEN** a mesma requisição é feita de novo e, ao ter sucesso, o produto aparece

#### Scenario: Produto inexistente
- **WHEN** a API responde `404` com `PRODUCT_NOT_FOUND`
- **THEN** a tela mostra "Product not found" e a ação "Back to products", que leva a `/`

### Requirement: Somente o resultado mais recente é exibido
Ao trocar o produto exibido ou sair da tela, a SPA SHALL cancelar a requisição em andamento e SHALL ignorar qualquer resposta que não seja a da requisição mais recente.

#### Scenario: Troca de produto com resposta atrasada
- **WHEN** o usuário passa do produto 1 para o produto 2 e a resposta do produto 1 chega depois
- **THEN** a tela mostra apenas o produto 2
