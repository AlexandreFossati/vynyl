# Spec Delta

## Purpose

Dar ao usuário uma visão geral do catálogo na tela inicial, com busca e paginação, em qualquer tamanho de tela.

## ADDED Requirements

### Requirement: Listagem inicial
Ao abrir `/`, o dashboard SHALL pedir à API a primeira página (`limit=30`, `offset=0`, sem `q`) e listar os produtos recebidos. Cada produto SHALL mostrar título, marca, categoria, preço e estoque; o SKU SHALL aparecer a partir de 1024 px de largura.

#### Scenario: Primeira página
- **WHEN** o usuário abre a tela inicial e a API devolve produtos
- **THEN** a lista mostra esses produtos com título, marca, categoria, preço e estoque

### Requirement: Busca com debounce
O campo de busca SHALL aguardar 300 ms sem digitação antes de disparar a busca. A busca SHALL usar o texto sem espaços nas pontas como `q`, SHALL omitir `q` quando o texto está vazio, SHALL limitar o texto a 100 caracteres e SHALL voltar à página 1.

#### Scenario: Digitação rápida gera uma busca
- **WHEN** o usuário digita várias letras em sequência, cada uma em menos de 300 ms
- **THEN** uma única requisição é feita, depois da última tecla, com o texto completo em `q`

#### Scenario: Volta à primeira página
- **WHEN** o usuário está na página 2 e altera a busca
- **THEN** a nova requisição usa `offset=0`

#### Scenario: Busca vazia
- **WHEN** o usuário apaga o texto da busca
- **THEN** a requisição não contém `q`

### Requirement: Paginação de 30 por página
O dashboard SHALL exibir 30 produtos por página, os controles "Previous" e "Next" e o intervalo exibido (por exemplo, "Showing 1–30 of 44"). "Previous" SHALL estar desabilitado na primeira página e "Next" na última. Mudar de página SHALL pedir a API com o `offset` correspondente.

#### Scenario: Próxima página
- **WHEN** o usuário está na página 1 de um catálogo de 44 produtos e aciona "Next"
- **THEN** a requisição usa `offset=30` e o texto mostra "Showing 31–44 of 44"

#### Scenario: Limites
- **WHEN** o usuário está na primeira ou na última página
- **THEN** "Previous" ou "Next", respectivamente, está desabilitado

### Requirement: Estados de carregando, vazio e erro
O dashboard SHALL mostrar um indicador de carregamento enquanto aguarda a primeira resposta, uma mensagem de vazio quando a busca não encontra produtos (com a ação "Clear search" quando há texto de busca) e uma mensagem de erro com a ação "Try again" quando a requisição falha. "Try again" SHALL repetir a mesma requisição. O erro SHALL ser anunciado a tecnologias assistivas (`role="alert"`) e SHALL NOT exibir detalhes técnicos.

#### Scenario: Carregando
- **WHEN** a primeira resposta ainda não chegou
- **THEN** a tela mostra o indicador de carregamento

#### Scenario: Sem resultados
- **WHEN** a busca não encontra nenhum produto
- **THEN** a tela mostra a mensagem de vazio e a ação "Clear search", que limpa a busca e recarrega a lista

#### Scenario: Falha e nova tentativa
- **WHEN** a requisição falha e o usuário aciona "Try again"
- **THEN** a mesma requisição é feita de novo e, ao ter sucesso, a lista aparece

### Requirement: Somente o resultado mais recente é exibido
Ao iniciar uma nova requisição, o dashboard SHALL cancelar a anterior, e SHALL ignorar qualquer resposta que não seja a da requisição mais recente. Durante recargas depois da primeira, a lista anterior SHALL permanecer visível e marcada como ocupada (`aria-busy`).

#### Scenario: Respostas fora de ordem
- **WHEN** duas buscas são disparadas em sequência e a resposta da primeira chega depois da segunda
- **THEN** a lista mostra apenas o resultado da segunda

### Requirement: Tabela no desktop e cartões no mobile
A lista SHALL ser exibida como cartões abaixo de 640 px e como tabela a partir de 640 px; a tabela SHALL ter legenda e cabeçalhos de coluna para tecnologias assistivas, e SHALL exibir as colunas de marca e SKU somente a partir de 1024 px. Apenas uma das duas apresentações SHALL ficar visível e acessível por vez.

#### Scenario: Mobile
- **WHEN** a largura é de 360 px
- **THEN** os produtos aparecem como cartões, sem tabela visível

#### Scenario: Desktop
- **WHEN** a largura é de 1280 px
- **THEN** os produtos aparecem em uma tabela com as colunas de marca e SKU

### Requirement: Apresentação de preço e estoque
O preço SHALL ser exibido como moeda (dólar, duas casas decimais). O estoque SHALL ser exibido com um selo: `Out of stock` quando é 0, `Low stock` quando está entre 1 e 10 e `In stock` acima de 10, sempre com o número de unidades e sem depender apenas da cor.

#### Scenario: Faixas de estoque
- **WHEN** o estoque é 0, 10 e 11
- **THEN** os selos são `Out of stock`, `Low stock` e `In stock`, respectivamente

#### Scenario: Preço
- **WHEN** o preço é `1299`
- **THEN** o texto exibido é `$1,299.00`

### Requirement: Acessibilidade básica
O campo de busca SHALL ter um rótulo associado, a contagem de resultados SHALL ser anunciada por uma região `aria-live="polite"` e todos os controles SHALL ser operáveis pelo teclado.

#### Scenario: Rótulo da busca
- **WHEN** um leitor de tela lê o campo de busca
- **THEN** ele é identificado como "Search products"
