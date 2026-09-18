# Spec Delta

## Purpose

Definir a estrutura relacional e as garantias de integridade da tabela de produtos, versionadas em migrations reproduzíveis, para que qualquer camada de acesso a dados possa confiar no banco como última linha de defesa.

## ADDED Requirements

### Requirement: Estrutura da tabela de produtos
O banco SHALL possuir a tabela `products` com as colunas: `id` (inteiro, chave primária com incremento automático), `title`, `description`, `category`, `price_cents` (inteiro), `stock` (inteiro), `brand`, `sku`, `weight` (número real), `created_at` e `updated_at` (texto). Todas as colunas SHALL ser obrigatórias, exceto `id`, que é gerado pelo banco.

#### Scenario: Inserção válida gera identificador
- **WHEN** um produto com todos os campos obrigatórios é inserido sem informar `id`
- **THEN** o banco atribui um `id` inteiro positivo e crescente

#### Scenario: Campo obrigatório ausente
- **WHEN** uma inserção omite qualquer coluna obrigatória (exceto `id`, `created_at` e `updated_at`)
- **THEN** o banco rejeita a inserção

### Requirement: Unicidade do SKU
O banco SHALL garantir que o `sku` de cada produto seja único.

#### Scenario: SKU duplicado é rejeitado
- **WHEN** é inserido um produto cujo `sku` já existe na tabela
- **THEN** o banco rejeita a inserção com violação de unicidade e a tabela permanece inalterada

### Requirement: Restrições de valores numéricos
O banco SHALL rejeitar valores fora dos limites de negócio: `price_cents` MUST ser maior ou igual a 0, `stock` MUST ser maior ou igual a 0 e `weight` MUST ser maior que 0.

#### Scenario: Preço negativo
- **WHEN** é inserido ou atualizado um produto com `price_cents` menor que 0
- **THEN** o banco rejeita a operação

#### Scenario: Estoque negativo
- **WHEN** é inserido ou atualizado um produto com `stock` menor que 0
- **THEN** o banco rejeita a operação

#### Scenario: Peso zero ou negativo
- **WHEN** é inserido ou atualizado um produto com `weight` menor ou igual a 0
- **THEN** o banco rejeita a operação

#### Scenario: Valores limite aceitos
- **WHEN** é inserido um produto com `price_cents` igual a 0, `stock` igual a 0 e `weight` maior que 0
- **THEN** o banco aceita a inserção

### Requirement: Índice por categoria
O banco SHALL possuir um índice sobre a coluna `category` para suportar filtragem por categoria.

#### Scenario: Índice presente
- **WHEN** a estrutura do banco é inspecionada após aplicar as migrations
- **THEN** existe um índice sobre `products.category`

### Requirement: Carimbos de data e hora padrão
Quando `created_at` e `updated_at` não forem informados na inserção, o banco SHALL preenchê-los com o instante atual em UTC no formato ISO 8601 com milissegundos e sufixo `Z` (por exemplo, `2025-04-30T09:41:02.053Z`).

#### Scenario: Inserção sem carimbos
- **WHEN** um produto é inserido sem `created_at` e `updated_at`
- **THEN** ambos são preenchidos com um texto no formato ISO 8601 UTC com milissegundos e sufixo `Z`

#### Scenario: Inserção com carimbos explícitos
- **WHEN** um produto é inserido informando `created_at` e `updated_at`
- **THEN** os valores informados são preservados sem alteração

### Requirement: Migration versionada e reproduzível
A estrutura do banco SHALL ser criada exclusivamente por migrations SQL versionadas no repositório em `apps/api/drizzle/`. Aplicar todas as migrations a um banco vazio SHALL produzir a estrutura completa descrita nesta capability. O script `db:generate` SHALL gerar novas migrations a partir do schema e SHALL não produzir alterações quando o schema e as migrations estiverem em sincronia.

#### Scenario: Banco vazio recebe a estrutura completa
- **WHEN** as migrations são aplicadas a um banco SQLite vazio
- **THEN** a tabela `products` existe com colunas, restrições, unicidade e índice conforme esta capability

#### Scenario: Schema e migrations em sincronia
- **WHEN** o desenvolvedor executa `npm run db:generate -w apps/api` sem ter alterado o schema
- **THEN** o comando informa que não há mudanças e nenhum arquivo novo é criado
