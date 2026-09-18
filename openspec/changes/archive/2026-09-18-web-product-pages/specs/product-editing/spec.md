# Spec Delta

## Purpose

Permitir criar e editar produtos pela interface com um formulário único, validado no cliente com as mesmas regras da API e capaz de mostrar, no campo certo, os erros que o servidor devolve.

## ADDED Requirements

### Requirement: Formulário compartilhado de criação e edição
`/products/new` SHALL mostrar o formulário vazio e `/products/:id/edit` SHALL carregar o produto e mostrar o mesmo formulário preenchido com seus valores. O formulário SHALL ter um campo, com rótulo visível, para cada um de: título, descrição, categoria, preço, estoque, marca, SKU e peso. `id` e `meta` SHALL NOT aparecer. Na edição, os estados de carregamento, falha (com "Try again") e produto inexistente SHALL ser os mesmos do detalhe.

#### Scenario: Criar
- **WHEN** o usuário abre `/products/new`
- **THEN** o formulário aparece com todos os campos vazios e a ação "Create product"

#### Scenario: Editar
- **WHEN** o usuário abre `/products/1/edit` e a API devolve o produto 1
- **THEN** o formulário aparece preenchido com os valores do produto e a ação "Save changes"

#### Scenario: Editar produto inexistente
- **WHEN** a API responde `404` `PRODUCT_NOT_FOUND` ao carregar o produto
- **THEN** a tela mostra "Product not found" e a ação "Back to products"

### Requirement: Validação no cliente com o schema compartilhado
Ao enviar, o formulário SHALL validar os valores com o schema de criação de produto de `@vynyl/shared` (as mesmas regras da API) antes de qualquer requisição. Cada campo inválido SHALL mostrar sua mensagem junto ao campo, o campo SHALL ser marcado como inválido (`aria-invalid`) e associado à mensagem (`aria-describedby`), e o foco SHALL ir para o primeiro campo inválido. Campo em branco SHALL mostrar "Required"; preço, estoque e peso que não são números SHALL mostrar uma mensagem própria. Nenhuma requisição SHALL ser feita enquanto houver erro. Espaços nas pontas dos textos SHALL ser ignorados.

#### Scenario: Envio com campos inválidos
- **WHEN** o usuário envia o formulário vazio
- **THEN** todos os campos obrigatórios mostram "Required", nenhuma requisição é feita e o foco vai para o primeiro campo

#### Scenario: Regras do produto
- **WHEN** o usuário informa preço com três casas decimais, estoque negativo, categoria com maiúsculas ou SKU com letras minúsculas
- **THEN** cada campo mostra a mensagem da regra violada e nenhuma requisição é feita

#### Scenario: Valor não numérico
- **WHEN** o usuário informa `abc` no preço
- **THEN** o campo do preço mostra uma mensagem pedindo um número

#### Scenario: Valores válidos
- **WHEN** o usuário envia valores válidos (com espaços nas pontas do título)
- **THEN** a requisição é feita com os valores convertidos e aparados

### Requirement: Criar e salvar
Ao enviar valores válidos em `/products/new`, a SPA SHALL criar o produto na API (`POST` com todos os campos). Ao enviar valores válidos em `/products/:id/edit`, SHALL atualizá-lo (`PATCH` com todos os campos). Em ambos os casos, com sucesso, SHALL mostrar um toast de sucesso e navegar para o detalhe do produto (o recém-criado, ou o editado). Durante o envio, o botão de envio SHALL ficar desabilitado e indicar que está salvando, de modo que um segundo envio não seja possível.

#### Scenario: Criação bem-sucedida
- **WHEN** o usuário envia o formulário de criação válido e a API responde `201`
- **THEN** aparece o toast "Product created" e a SPA abre `/products/<id do novo produto>`

#### Scenario: Edição bem-sucedida
- **WHEN** o usuário envia o formulário de edição válido e a API responde `200`
- **THEN** aparece o toast "Product updated" e a SPA abre o detalhe do produto

#### Scenario: Envio em andamento
- **WHEN** o usuário envia o formulário e a resposta ainda não chegou
- **THEN** o botão de envio está desabilitado, indica "Saving…" e um novo clique não gera outra requisição

### Requirement: Erros devolvidos pela API
Se a API responder `409` `SKU_CONFLICT`, o formulário SHALL mostrar a mensagem no campo do SKU, manter todos os valores digitados e mover o foco para o SKU. Se responder `400` `VALIDATION_ERROR` com `details`, SHALL mostrar cada mensagem no campo correspondente; um `path` que não é um campo do formulário SHALL virar um toast de erro. Qualquer outra falha SHALL mostrar um toast de erro sem detalhes técnicos, manter os valores digitados e reabilitar o envio. Se a edição receber `404` `PRODUCT_NOT_FOUND` (o produto foi removido), SHALL mostrar um toast de erro e voltar ao dashboard.

#### Scenario: SKU duplicado
- **WHEN** a API responde `409` `SKU_CONFLICT` ao salvar
- **THEN** o campo SKU mostra que o SKU já existe, os demais valores permanecem, o foco está no SKU e o botão volta a ficar habilitado

#### Scenario: Validação do servidor
- **WHEN** a API responde `400` com `details` apontando `price`
- **THEN** a mensagem aparece no campo do preço

#### Scenario: Falha de rede
- **WHEN** o envio falha por erro de rede ou `5xx`
- **THEN** aparece um toast de erro genérico, os valores permanecem e o usuário pode enviar de novo

#### Scenario: Produto removido durante a edição
- **WHEN** a API responde `404` `PRODUCT_NOT_FOUND` ao salvar
- **THEN** aparece um toast de erro e a SPA volta ao dashboard

### Requirement: Cancelar
O formulário SHALL ter a ação "Cancel", que volta ao dashboard (criação) ou ao detalhe do produto (edição) sem enviar nada.

#### Scenario: Cancelar a criação
- **WHEN** o usuário aciona "Cancel" em `/products/new`
- **THEN** a SPA abre `/` e nenhuma requisição de escrita é feita

#### Scenario: Cancelar a edição
- **WHEN** o usuário aciona "Cancel" em `/products/1/edit`
- **THEN** a SPA abre `/products/1` e nenhuma requisição de escrita é feita

### Requirement: Layout responsivo do formulário
O formulário SHALL usar uma coluna abaixo de 640 px e duas colunas a partir de 640 px (título e descrição ocupam a largura toda), com controles de pelo menos 44 px de altura e sem rolagem horizontal em 360, 768 e 1280 px.

#### Scenario: Mobile e desktop
- **WHEN** a largura é de 360 px e depois de 1280 px
- **THEN** os campos aparecem em uma coluna e em duas colunas, respectivamente, sem rolagem horizontal
