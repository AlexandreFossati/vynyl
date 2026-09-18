# graceful-shutdown Specification

## Purpose

Garantir que a API encerre sem interromper requisições em andamento nem deixar o banco aberto, tanto ao receber um sinal do sistema quanto no `Ctrl+C` do desenvolvedor.

## Requirements

### Requirement: Encerramento limpo por sinal
Ao receber `SIGINT` ou `SIGTERM`, a API SHALL parar de aceitar novas conexões, aguardar a conclusão das requisições em andamento, fechar a conexão com o banco de dados e encerrar o processo com código de saída 0, registrando o início e o fim do encerramento. Durante o encerramento, novas conexões SHALL ser recusadas.

#### Scenario: Requisição em andamento conclui
- **WHEN** o sinal chega enquanto uma requisição ainda está sendo atendida
- **THEN** essa requisição recebe sua resposta completa, o banco é fechado depois dela e o processo encerra com código 0

#### Scenario: Novas conexões recusadas
- **WHEN** o encerramento já começou e um cliente tenta se conectar
- **THEN** a conexão é recusada

#### Scenario: Sem requisições em andamento
- **WHEN** o sinal chega com o servidor ocioso
- **THEN** o processo encerra rapidamente com código 0 e o banco fechado

### Requirement: Tempo máximo de encerramento
Se as requisições em andamento não terminarem em 10 segundos, a API SHALL encerrar as conexões restantes, registrar o encerramento forçado e sair com código diferente de zero.

#### Scenario: Requisição que não termina
- **WHEN** uma requisição permanece pendente além do tempo máximo após o sinal
- **THEN** as conexões são encerradas, o log registra o encerramento forçado e o código de saída é 1

### Requirement: Encerramento único
Sinais repetidos durante o encerramento SHALL ser ignorados: apenas um encerramento é executado. Uma falha ao encerrar SHALL ser registrada e resultar em código de saída 1.

#### Scenario: Sinal repetido
- **WHEN** um segundo sinal chega enquanto o encerramento está em curso
- **THEN** nenhum segundo encerramento é iniciado e o resultado é o mesmo de um único sinal
