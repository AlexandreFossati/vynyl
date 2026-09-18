# Spec Delta

## Purpose

Evitar trabalho duplicado quando várias requisições idênticas de leitura chegam ao mesmo tempo, executando a consulta uma única vez e compartilhando o resultado (singleflight), sem manter cache.

## ADDED Requirements

### Requirement: Leituras concorrentes idênticas compartilham uma execução
Quando várias chamadas de leitura idênticas (mesma operação e mesmos parâmetros) estão em andamento ao mesmo tempo, a consulta SHALL executar uma única vez e todas as chamadas SHALL receber o mesmo resultado. Isso SHALL valer para obter um produto por `id` e para a listagem (com o mesmo `limit`, `offset` e `q`). Chamadas com parâmetros diferentes SHALL NOT ser coalescidas.

#### Scenario: Chamadas simultâneas idênticas
- **WHEN** cinco leituras da listagem com os mesmos parâmetros começam enquanto a primeira ainda não terminou
- **THEN** a consulta ao banco é executada uma vez e as cinco recebem o mesmo resultado

#### Scenario: Parâmetros diferentes
- **WHEN** leituras simultâneas usam `id` diferentes, ou `limit`/`offset`/`q` diferentes
- **THEN** cada combinação executa sua própria consulta

### Requirement: Sem cache
O resultado SHALL ser compartilhado apenas entre chamadas simultâneas. Depois que a execução termina, uma nova chamada idêntica SHALL executar a consulta novamente.

#### Scenario: Chamadas em sequência
- **WHEN** uma leitura termina e, depois, outra idêntica é feita
- **THEN** a consulta é executada de novo

### Requirement: Erros são compartilhados e não ficam presos
Se a execução compartilhada falhar, todas as chamadas que a aguardavam SHALL receber o mesmo erro, e a chave SHALL ser liberada para que a próxima chamada tente de novo.

#### Scenario: Falha compartilhada
- **WHEN** a consulta falha enquanto várias chamadas idênticas aguardam
- **THEN** todas rejeitam com o mesmo erro e uma chamada posterior executa a consulta novamente

### Requirement: Escritas nunca são coalescidas
Criar, atualizar e remover produtos SHALL executar sempre, uma vez por chamada, mesmo que idênticas e simultâneas.

#### Scenario: Duas criações simultâneas
- **WHEN** duas criações idênticas chegam ao mesmo tempo
- **THEN** o repositório é chamado duas vezes (a segunda pode falhar por SKU duplicado, como esperado)
