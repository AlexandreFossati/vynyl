# Spec Delta

## Purpose

Permitir excluir um produto pelo detalhe, com uma confirmação explícita que evita a remoção acidental e é utilizável por teclado e leitor de tela.

## ADDED Requirements

### Requirement: Confirmação antes de excluir
Ao acionar "Delete" no detalhe, a SPA SHALL abrir um diálogo modal com o título "Delete product?", o nome do produto, e as ações "Delete" (confirmar) e "Cancel". Nenhuma requisição de remoção SHALL ser feita antes da confirmação. "Cancel" SHALL fechar o diálogo sem remover nada.

#### Scenario: Abrir o diálogo
- **WHEN** o usuário aciona "Delete" no detalhe de um produto
- **THEN** o diálogo aparece com o título "Delete product?" e o nome do produto, e nenhuma requisição de remoção foi feita

#### Scenario: Cancelar
- **WHEN** o usuário aciona "Cancel"
- **THEN** o diálogo fecha, o produto permanece na tela e nenhuma requisição de remoção é feita

### Requirement: Foco e teclado no diálogo
O diálogo SHALL ser modal: ao abrir, o foco inicial SHALL ficar em "Cancel" (a ação segura), o foco SHALL permanecer dentro do diálogo enquanto ele está aberto e SHALL voltar ao botão que o abriu ao fechar. A tecla Esc SHALL cancelar o diálogo, exceto enquanto a remoção está em andamento. O diálogo SHALL ter nome acessível (o título) e SHALL ocupar a tela toda abaixo de 640 px.

#### Scenario: Esc cancela
- **WHEN** o diálogo está aberto e o usuário pressiona Esc
- **THEN** o diálogo fecha sem remover o produto e o foco volta ao botão "Delete" da página

#### Scenario: Foco inicial
- **WHEN** o diálogo abre
- **THEN** o foco está em "Cancel"

#### Scenario: Reabrir depois do Esc
- **WHEN** o usuário fecha o diálogo com Esc e aciona "Delete" de novo
- **THEN** o diálogo abre outra vez

#### Scenario: Foco preso
- **WHEN** o usuário pressiona Tab mais vezes do que o diálogo tem controles
- **THEN** o foco nunca vai para um controle da página que está atrás dele

### Requirement: Excluir
Ao confirmar, a SPA SHALL remover o produto na API. Durante a remoção, as ações do diálogo SHALL ficar desabilitadas. Com sucesso (`204`), SHALL mostrar o toast "Product deleted" e navegar para `/`. Se a API responder `404` `PRODUCT_NOT_FOUND`, SHALL mostrar um toast de erro informando que o produto não existe mais e navegar para `/`. Qualquer outra falha SHALL fechar o diálogo, mostrar um toast de erro sem detalhes técnicos e manter o usuário no detalhe.

#### Scenario: Exclusão bem-sucedida
- **WHEN** o usuário confirma e a API responde `204`
- **THEN** aparece o toast "Product deleted" e a SPA abre `/`

#### Scenario: Remoção em andamento
- **WHEN** o usuário confirma e a resposta ainda não chegou
- **THEN** as ações do diálogo estão desabilitadas e Esc não fecha o diálogo

#### Scenario: Produto já removido
- **WHEN** a API responde `404` `PRODUCT_NOT_FOUND` à remoção
- **THEN** aparece um toast de erro e a SPA abre `/`

#### Scenario: Falha na remoção
- **WHEN** a remoção falha por erro de rede ou `5xx`
- **THEN** o diálogo fecha, aparece um toast de erro e o detalhe do produto continua na tela
