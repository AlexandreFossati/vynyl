# Proposal

## Why

O repositório contém apenas documentos de planejamento. Todas as tarefas seguintes (API, SPA, testes, `npm start`) dependem de uma base comum: monorepo instalável, tooling validado, banco de dados com schema versionado e o data set que alimenta a aplicação. Fixar isso primeiro, **sem lógica de aplicação**, permite revisar a estrutura em um commit isolado (T1 do `OPENSPEC_TASKS.md`) antes de construir sobre ela, e detectar cedo problemas de instalação em Windows (`@libsql/client`, Cypress) e incompatibilidades entre versões de pacotes.

## What Changes

- Criar o monorepo com npm workspaces: `apps/api`, `apps/web` e `packages/shared`, com scripts de raiz multiplataforma (`lint`, `typecheck`, `test`, `format`, `build`, `dev`).
- Fixar o runtime (`.nvmrc` + `engines`) e configurar TypeScript estrito, ESLint e Prettier em uma configuração única na raiz.
- Criar o esqueleto de pastas de cada pacote conforme a seção 3 do guia (camadas da API e níveis do Atomic Design), com arquivos placeholder mínimos e sem lógica.
- Criar um `App.svelte` mínimo que apenas renderiza o título, para provar que a toolchain do frontend funciona.
- Configurar Vitest (api, web e shared), Testing Library no web e o Cypress (`cypress.config.ts`, sem specs).
- Instalar as dependências já decididas no guia, fechando o `package-lock.json`, e validar a instalação em Windows.
- Definir o schema Drizzle da tabela `products` (com constraints e índice) e gerar/versionar a migration inicial em `apps/api/drizzle/`, com o script `db:generate`.
- Criar o data set `data/products.json` (40+ produtos) no formato do template do PDF.
- Criar `.gitignore` e `.env.example`.

**Fora de escopo** (T2 em diante): app Express, handlers, schemas Zod, seed, config/logger, componentes, tokens de design, CI e README final. Nenhuma alteração de comportamento de produto é introduzida.

## Capabilities

### New Capabilities

- `monorepo-workspace`: estrutura do repositório, pacotes do workspace, scripts de raiz, versão do runtime, verificações estáticas (lint, tipos, testes) e regras de arquivos ignorados/versionados.
- `product-database-schema`: estrutura da tabela `products`, suas restrições de integridade e índice, e a migration versionada que a cria.
- `product-dataset`: contrato do data set inicial de produtos (`data/products.json`) que será carregado pela aplicação.

### Modified Capabilities

<!-- Nenhuma: openspec/specs/ está vazio, não há capabilities existentes. -->

## Impact

- **Código**: nenhum código de aplicação. Apenas configuração, placeholders, o schema Drizzle (`apps/api/src/db/schema.ts`), a migration SQL gerada e o JSON de dados.
- **Dependências**: todas as decididas na seção 2 do guia (Express 5, Drizzle ORM/Kit, `@libsql/client`, Zod, pino, pino-http, express-rate-limit, Svelte 5, Vite, Vitest, Testing Library, Cypress, ESLint, Prettier, TypeScript etc.), mais `tsup` (bundle da API), `tsx` (execução em desenvolvimento) e `concurrently` (script `dev` na raiz). Versões e restrições de compatibilidade estão no `design.md`.
- **Riscos que motivam a ordem**: o `latest` de alguns pacotes é incompatível com o restante do tooling (ex.: TypeScript 7 não é aceito pelo `typescript-eslint` nem pelo `svelte-check`); o download do binário do Cypress pesa no `npm install`; e o `better-sqlite3` v13 tenta compilar via `node-gyp` ao instalar a partir do lockfile, o que motivou o uso do `@libsql/client` (ver `design.md`, D16).
- **Documentação**: o progresso é refletido no `OPENSPEC_TASKS.md`; nenhuma decisão do `PROJECT_GUIDE.md` é alterada por este change, apenas detalhadas no `design.md`.
