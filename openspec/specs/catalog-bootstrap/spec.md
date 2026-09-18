# catalog-bootstrap Specification

## Purpose

Garantir que, ao iniciar, a API encontre o banco com a estrutura correta e os dados iniciais do catálogo, de forma automática, repetível e sem duplicar dados em reinícios.

## Requirements

### Requirement: Migrations aplicadas na inicialização
Ao iniciar, a API SHALL aplicar todas as migrations pendentes da pasta versionada `apps/api/drizzle/` antes de aceitar conexões. Um banco novo SHALL receber a estrutura completa; um banco já migrado SHALL permanecer inalterado.

#### Scenario: Banco novo
- **WHEN** a API inicia com um arquivo de banco inexistente
- **THEN** o arquivo é criado e a tabela `products` existe com toda a sua estrutura antes de a API responder

#### Scenario: Reinício sobre banco migrado
- **WHEN** a API reinicia sobre um banco que já recebeu as migrations
- **THEN** nenhuma migration é reaplicada e os dados existentes permanecem intactos

### Requirement: Seed inicial idempotente
Depois das migrations, se a tabela `products` estiver vazia, a API SHALL carregar `data/products.json` e inserir todos os produtos, preservando os `id` e os carimbos `createdAt`/`updatedAt` do arquivo. Se a tabela já tiver ao menos um produto, a API SHALL NOT inserir nem alterar nada. Após o seed, o próximo `id` gerado automaticamente SHALL ser maior que o maior `id` do data set.

#### Scenario: Primeira inicialização
- **WHEN** a API inicia com o banco vazio e o data set de 44 produtos
- **THEN** a tabela passa a ter 44 produtos com os mesmos `id`, campos e carimbos do arquivo

#### Scenario: Reinícios não duplicam
- **WHEN** a API é reiniciada uma ou mais vezes com o banco já populado
- **THEN** a tabela continua com exatamente 44 produtos

#### Scenario: Próximo identificador
- **WHEN** um novo produto é inserido sem informar `id` depois do seed
- **THEN** ele recebe o `id` 45

### Requirement: Preço convertido para centavos sem erro de ponto flutuante
Ao inserir, o preço decimal do arquivo SHALL ser convertido para centavos inteiros exatos.

#### Scenario: Valores problemáticos em ponto flutuante
- **WHEN** o seed processa produtos com preço `19.99`, `0.29` e `4.35`
- **THEN** ficam armazenados 1999, 29 e 435 centavos, respectivamente

### Requirement: Data set inválido interrompe a inicialização sem dados parciais
O conteúdo de `data/products.json` SHALL ser validado contra o contrato do produto antes de qualquer inserção. Se houver qualquer produto inválido, JSON malformado, ou violação de unicidade (`id` ou `sku` repetidos) durante a inserção, a inicialização SHALL falhar com um erro que identifique o problema, e nenhum produto SHALL ser inserido (operação atômica).

#### Scenario: Produto inválido
- **WHEN** o data set contém um produto com `stock` negativo
- **THEN** a inicialização falha indicando o item e o campo inválidos, e a tabela permanece vazia

#### Scenario: SKU repetido
- **WHEN** o data set contém dois produtos com o mesmo `sku`
- **THEN** a inicialização falha e nenhum dos produtos do arquivo permanece na tabela

#### Scenario: JSON malformado
- **WHEN** `data/products.json` não é um JSON válido
- **THEN** a inicialização falha com uma mensagem que aponta o arquivo, e a tabela permanece vazia

### Requirement: Configuração da conexão
Ao abrir o banco, a API SHALL habilitar chaves estrangeiras e definir um tempo de espera por bloqueio (`busy_timeout`). Para bancos em arquivo, SHALL também usar o modo de journal WAL.

#### Scenario: Banco em arquivo
- **WHEN** a API abre um banco em arquivo
- **THEN** o modo de journal é `wal`, as chaves estrangeiras estão habilitadas e o `busy_timeout` está definido

#### Scenario: Banco em memória
- **WHEN** a API abre um banco `:memory:`
- **THEN** a abertura conclui sem erro, com as chaves estrangeiras habilitadas
