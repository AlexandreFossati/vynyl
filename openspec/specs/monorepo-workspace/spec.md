# monorepo-workspace Specification

## Purpose

Define a estrutura do repositório e as verificações de qualidade que qualquer desenvolvedor executa a partir da raiz, garantindo que o projeto seja instalável, verificável e portável entre sistemas operacionais desde o primeiro commit.

## Requirements

### Requirement: Workspace com três pacotes
O repositório SHALL ser um monorepo com exatamente três pacotes de workspace: `apps/api`, `apps/web` e `packages/shared`. Um único `npm install` na raiz SHALL instalar as dependências de todos os pacotes e gerar um único `package-lock.json` versionado.

#### Scenario: Instalação a partir de um clone limpo
- **WHEN** um desenvolvedor clona o repositório e executa `npm install` na raiz, com o runtime fixado
- **THEN** a instalação conclui sem erros, incluindo as dependências com componentes nativos, e nenhum passo manual adicional é necessário

#### Scenario: Pacotes reconhecidos pelo workspace
- **WHEN** o desenvolvedor lista os workspaces do npm
- **THEN** aparecem `apps/api`, `apps/web` e `packages/shared`, e os pacotes `api` e `web` declaram dependência de `shared`

### Requirement: Versão do runtime fixada
O repositório SHALL declarar a versão do runtime suportada por meio de `.nvmrc` e do campo `engines` do `package.json` da raiz. A versão declarada SHALL ser uma linha LTS do Node.js compatível com todas as dependências instaladas.

#### Scenario: Versão declarada de forma consistente
- **WHEN** o desenvolvedor compara o `.nvmrc` com o campo `engines`
- **THEN** a versão do `.nvmrc` satisfaz o intervalo declarado em `engines`

### Requirement: Scripts de raiz multiplataforma
A raiz SHALL expor os scripts `lint`, `typecheck`, `test`, `format`, `build` e `dev`. Nenhum script SHALL depender de sintaxe exclusiva de um shell específico, de modo que funcionem em Windows, Linux e macOS.

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

### Requirement: Verificação estrita de tipos
A verificação de tipos SHALL operar em modo estrito em todos os pacotes. Código com erro de tipo, inclusive uso de tipo implícito indefinido, SHALL fazer `npm run typecheck` falhar.

#### Scenario: Erro de tipo é detectado
- **WHEN** um arquivo TypeScript de qualquer pacote contém um erro de tipo
- **THEN** `npm run typecheck` termina com código de saída diferente de 0 apontando o arquivo e a linha

### Requirement: Esqueleto de pastas sem lógica de aplicação
O repositório SHALL conter a estrutura de pastas definida na seção 3 do `PROJECT_GUIDE.md`: as pastas de camadas da API (`config`, `routes`, `handlers`, `services`, `repositories`, `mappers`, `db`, `middleware`, `lib`), as pastas do Atomic Design da SPA (`atoms`, `molecules`, `organisms`, `templates`, `pages`), além de `lib/api` e `styles`. Pastas ainda sem conteúdo SHALL ser versionadas por meio de arquivos marcadores. Nenhum arquivo placeholder SHALL conter lógica de aplicação.

#### Scenario: Estrutura presente após o clone
- **WHEN** o desenvolvedor clona o repositório
- **THEN** todas as pastas de camadas e de níveis do Atomic Design existem, mesmo as vazias

### Requirement: Página placeholder da SPA
A SPA SHALL exibir uma página mínima contendo apenas o título da aplicação, comprovando que o ambiente de desenvolvimento e o build do frontend funcionam.

#### Scenario: Página servida em desenvolvimento
- **WHEN** o servidor de desenvolvimento da SPA está em execução e o desenvolvedor abre o endereço local no navegador
- **THEN** a página carrega e exibe o título da aplicação, sem erros no console

### Requirement: Executores de teste configurados
Os pacotes `api`, `web` e `shared` SHALL ter o executor de testes unitários configurado, e o pacote `web` SHALL ter o ambiente de testes de componentes preparado. O executor de testes end-to-end SHALL estar configurado no pacote `web` sem nenhum arquivo de teste.

#### Scenario: Executor unitário do frontend em ambiente de navegador simulado
- **WHEN** um teste de componente é adicionado ao pacote `web` e `npm test` é executado
- **THEN** o teste roda em um ambiente com DOM e pode renderizar componentes da SPA

### Requirement: Arquivos ignorados e modelo de ambiente
O repositório SHALL ignorar no controle de versão dependências instaladas, artefatos de build, arquivos de ambiente reais (`.env`), bancos de dados locais (`data/*.db` e seus arquivos auxiliares) e artefatos de execução dos testes end-to-end. O arquivo `data/products.json` SHALL permanecer versionado. Um `.env.example` SHALL ser versionado listando as variáveis de ambiente suportadas, com valores de exemplo sem segredos.

#### Scenario: Segredos e artefatos fora do controle de versão
- **WHEN** o desenvolvedor cria um `.env`, um banco `data/app.db` e executa o build
- **THEN** `git status` não lista esses arquivos como não rastreados

#### Scenario: Data set continua versionado
- **WHEN** o desenvolvedor executa `git status` após criar ou editar `data/products.json`
- **THEN** o arquivo aparece como rastreável, e não como ignorado
