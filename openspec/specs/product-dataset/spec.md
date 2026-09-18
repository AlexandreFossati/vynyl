# product-dataset Specification

## Purpose

Definir o contrato do data set inicial de produtos, no formato do template do enunciado, que alimenta a aplicação e permite demonstrar paginação, busca e filtragem com dados realistas e válidos.

## Requirements

### Requirement: Formato do arquivo
O arquivo `data/products.json` SHALL conter um array JSON válido (sem vírgulas finais, sem comentários) de objetos com exatamente os campos do template: `id`, `title`, `description`, `category`, `price`, `stock`, `brand`, `sku`, `weight` e `meta` com `createdAt` e `updatedAt`.

#### Scenario: JSON estritamente válido
- **WHEN** o arquivo é lido por um parser JSON estrito
- **THEN** a leitura conclui sem erro e o resultado é um array de objetos

#### Scenario: Campos exatos do template
- **WHEN** as chaves de cada produto são inspecionadas
- **THEN** cada produto possui exatamente as chaves do template, sem campos ausentes ou extras

### Requirement: Volume mínimo
O data set SHALL conter pelo menos 40 produtos, de modo que a listagem padrão de 30 itens produza mais de uma página.

#### Scenario: Mais de uma página no padrão
- **WHEN** os produtos do arquivo são contados
- **THEN** o total é maior ou igual a 40

### Requirement: Identificadores e SKUs únicos
Os `id` SHALL ser inteiros sequenciais começando em 1, sem repetição nem lacunas. Os `sku` SHALL ser únicos, ter entre 3 e 40 caracteres e conter apenas letras maiúsculas, dígitos e hífens.

#### Scenario: Identificadores sequenciais
- **WHEN** os `id` são ordenados
- **THEN** formam a sequência 1, 2, 3, ..., N sem lacunas nem duplicatas

#### Scenario: SKUs únicos e bem formados
- **WHEN** os `sku` são verificados
- **THEN** não há duplicatas e todos casam com `^[A-Z0-9-]{3,40}$`

### Requirement: Valores dentro das regras de negócio
Cada produto SHALL respeitar: `title` com 1 a 200 caracteres; `description` com 1 a 2000 caracteres; `category` em minúsculas com 1 a 50 caracteres; `price` numérico maior ou igual a 0 com no máximo 2 casas decimais; `stock` inteiro maior ou igual a 0; `brand` com 1 a 100 caracteres; `weight` numérico maior que 0. Textos SHALL não ter espaços nas extremidades.

#### Scenario: Todos os produtos válidos
- **WHEN** cada produto é validado contra as regras acima
- **THEN** nenhum produto viola qualquer regra

### Requirement: Carimbos de data e hora coerentes
`meta.createdAt` e `meta.updatedAt` SHALL estar no formato ISO 8601 UTC com milissegundos e sufixo `Z`, e `updatedAt` SHALL ser maior ou igual a `createdAt` em todo produto.

#### Scenario: Carimbos válidos e ordenados
- **WHEN** os carimbos de cada produto são verificados
- **THEN** ambos casam com o formato esperado e `updatedAt` não é anterior a `createdAt`

### Requirement: Itens de referência do enunciado
Os dois primeiros produtos SHALL ser os exemplos do enunciado: "Large Flux Capacitor" (`id` 1, categoria `automotive`, preço 9.99, estoque 42, marca `ACME`, SKU `ACM-FC-001`, peso 4) e "Medium Flux Capacitor" (`id` 2, categoria `automotive`, preço 5.99, estoque 42, marca `ACME`, SKU `ACM-FC-002`, peso 3.25), com as descrições e datas do enunciado.

#### Scenario: Exemplos do enunciado preservados
- **WHEN** os produtos de `id` 1 e 2 são lidos
- **THEN** seus campos correspondem exatamente aos valores do enunciado

### Requirement: Diversidade para demonstração
O data set SHALL conter pelo menos 5 categorias distintas e pelo menos 3 marcas distintas, e SHALL incluir ao menos um produto com `stock` igual a 0 (valor-limite válido). O conteúdo textual SHALL estar em inglês.

#### Scenario: Variedade de categorias e marcas
- **WHEN** as categorias e marcas distintas são contadas
- **THEN** existem pelo menos 5 categorias e 3 marcas

#### Scenario: Valor-limite de estoque presente
- **WHEN** os valores de `stock` são inspecionados
- **THEN** existe ao menos um produto com `stock` igual a 0
