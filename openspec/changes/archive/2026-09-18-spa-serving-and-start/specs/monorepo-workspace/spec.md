# Spec Delta

## MODIFIED Requirements

### Requirement: Scripts de raiz multiplataforma
A raiz SHALL expor os scripts `lint`, `typecheck`, `test`, `format`, `build`, `dev` e `start`. Nenhum script SHALL depender de sintaxe exclusiva de um shell específico, de modo que funcionem em Windows, Linux e macOS.

#### Scenario: Verificações estáticas passam em uma árvore limpa
- **WHEN** o desenvolvedor executa `npm run lint` e `npm run typecheck` na raiz de uma árvore sem modificações
- **THEN** ambos terminam com código de saída 0

#### Scenario: Testes sem casos ainda
- **WHEN** o desenvolvedor executa `npm test` na raiz e nenhum pacote possui testes
- **THEN** o comando termina com código de saída 0, sem falhar por ausência de testes

#### Scenario: Build de todos os pacotes
- **WHEN** o desenvolvedor executa `npm run build` na raiz
- **THEN** a API e a SPA são compiladas com sucesso e nenhum artefato de build é versionado

#### Scenario: Modo de desenvolvimento
- **WHEN** o desenvolvedor executa `npm run dev` na raiz
- **THEN** os processos de desenvolvimento da API e da SPA iniciam juntos, e a SPA fica acessível em um endereço local exibido no terminal

#### Scenario: Início de um comando
- **WHEN** o desenvolvedor executa `npm start` na raiz de um clone com as dependências instaladas e sem nenhum build anterior
- **THEN** a API e a SPA são compiladas, o servidor sobe em `http://localhost:3000` (ou na `PORT` configurada) servindo a API e a SPA, e o log indica que está escutando

#### Scenario: Início falha se o build falha
- **WHEN** o build de algum pacote falha durante `npm start`
- **THEN** o servidor não é iniciado e o comando termina com código de saída diferente de 0
