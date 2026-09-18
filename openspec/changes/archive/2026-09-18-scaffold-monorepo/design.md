# Design

## Context

Repositório com apenas documentação (`PROJECT_GUIDE.md`, `OPENSPEC_TASKS.md`, `CLAUDE.md`, `DELIVERABLES.md`, `README.md` com uma linha e `openspec/`). Não há `package.json`, código nem `.gitignore`. Desenvolvimento em **Windows 11**, Node **v24.21.0**, npm **11.19.0**. Motivação e escopo: ver `proposal.md`; requisitos verificáveis: ver `specs/`.

Fatos levantados na pesquisa (consultas ao registro npm e a `nodejs.org` em 2026-09-18) que condicionam as decisões:

- **Node 24 é LTS** (Krypton, 24.21.0). Node 22 (Jod) está em LTS de manutenção; Node 26 é a linha "Current".
- O `latest` de vários pacotes é recente: TypeScript **7.0.2**, Vite **8.3**, Vitest **5.0.1**, ESLint **10.10**, `better-sqlite3` **13.0.3**, `@libsql/client` **0.18.0**, Zod **4.6.5**, Cypress **16.1**, Express **5.2.1**, drizzle-orm **0.45.2**, drizzle-kit **0.31.10**, Svelte **5.57**.
- **Incompatibilidade real**: `typescript-eslint@8.70` exige `typescript <6.1.0` e `svelte-check@4.7` aceita apenas TypeScript `^5 || ^6`. Logo, o TypeScript 7 (`latest`) **não pode ser usado**; a última versão 6.x é **6.0.3**.
- Compatíveis com o resto: `@sveltejs/vite-plugin-svelte@7.3` exige `vite ^8`; `vitest@5` aceita `vite ^6.4 || ^7 || ^8`; `typescript-eslint` e `eslint-plugin-svelte` aceitam ESLint 10; Cypress 16 exige Node `^22 || ^24 || >=26`.
- **Achado na implementação (tarefa 3.1)**: `better-sqlite3@13` instala bem numa instalação do zero, mas **falha ao instalar a partir do lockfile** (tenta `node-gyp rebuild`). Isso não aparecia na pesquisa inicial, que só testou instalação sem lockfile. Decisão D16: usar `@libsql/client`.

## Goals / Non-Goals

**Goals:**
- Base instalável com um único `npm install`, com tooling validado de ponta a ponta (lint, tipos, testes, build, dev) **antes** de existir código de aplicação.
- Resolver aqui as decisões estruturais que afetam todas as tarefas seguintes: modelo de consumo do pacote `shared`, sistema de módulos, build da API e versões compatíveis.
- Banco e data set prontos e verificados de forma independente do código da aplicação.

**Non-Goals:**
- Qualquer lógica de aplicação, schemas Zod, seed, config/logger, componentes ou tokens (T2 em diante).
- CI, Docker, `README.md` final, `npm start` e `test:e2e` (T7/T8).
- Type-aware linting e regras extras de estilo (podem ser avaliadas após a revisão da T2).

## Decisions

### D1. Runtime: Node 24 no `.nvmrc`, `engines` aceita 22.22.2+ e 24.15+
`.nvmrc` = `24`. `engines.node` = `^22.22.2 || ^24.15.0`, que é a interseção real dos `engines` das dependências. Correção feita na implementação (tarefa 3.1): o limite mais estrito vem do `jsdom@30` (`^22.22.2 || ^24.15.0`); ESLint 10 exige `^22.13`, Vite 8 e Vitest 5 exigem `^22.12`. A versão inicial deste design (`^22.12.0 || ^24.0.0`) aceitaria versões em que os testes do web não rodam. **Alternativas**: fixar só `^24` (mais estrito, mas bloqueia avaliadores em Node 22 sem motivo técnico, pois `engines` apenas emite aviso); usar Node 26 (é "Current", não LTS). O ambiente é validado apenas em Node 24; Node 22 é declarado pelas dependências, mas não exercitado (ver Riscos).

### D2. Versões: `latest` compatível, exceto TypeScript `~6.0.3`
Usar intervalos com `^` resolvidos no `latest` compatível e fixados pelo `package-lock.json`, com duas exceções deliberadas: **TypeScript `~6.0.3`** (limite dos peers de `typescript-eslint` e `svelte-check`) e **`@types/node` `^24`** (alinhado ao runtime, e não ao `latest` 26). Antes de instalar, confirmar peers; se aparecer `ERESOLVE`, **não** usar `--force` nem `--legacy-peer-deps`: ajustar a versão. **Alternativa**: fixar tudo em versões exatas (mais reprodutível, mas o lockfile já garante isso). O TS 6.0 pode ter defaults diferentes do 5.x (ex.: `types`); por isso os `tsconfig` declaram explicitamente `types`, `module`, `moduleResolution` e `target`.

### D3. `@vynyl/shared` como pacote interno "somente fonte"
`packages/shared/package.json` exporta `./src/index.ts` diretamente (`"exports": { ".": "./src/index.ts" }`), **sem etapa de build**. Consumidores: Vite (web), Vitest (todos), `tsx` (API em desenvolvimento) e `tsup` (build da API). Verificação de tipos com `tsc --noEmit`. `api` e `web` o declaram como dependência `"@vynyl/shared": "*"`.
- **Build da API**: `tsup` empacota `src/server.ts` em `apps/api/dist/server.js` (ESM, target Node 22). Como o `tsup` **externaliza por padrão tudo o que está em `dependencies`**, `@vynyl/shared` **deve** estar em `noExternal`; as demais dependências continuam externas. `npm start` (T7) executará `node apps/api/dist/server.js`. Isso resolve o item 5 da seção 15 do guia.
- **Alternativas**: (a) `tsc -b` com project references e `dist` no `shared`: exige recompilar antes de cada typecheck/teste/dev, com mais atrito; (b) exports condicionais (`types` → src, `default` → dist): mesmo problema de build prévio para rodar; (c) rodar a API com `tsx` também em produção: dispensa build, mas executa TypeScript em runtime, o que enfraquece o argumento "production ready".
- **Trade-off**: todo consumidor precisa entender TypeScript. É verdade aqui (Vite, Vitest, tsx e tsup entendem).

### D4. ESM em todo o repositório, resolução `Bundler`
Todos os pacotes com `"type": "module"`; TypeScript com `module: ESNext` e `moduleResolution: Bundler`, sem extensões em imports relativos e com `verbatimModuleSyntax`. **Alternativa**: `NodeNext` (obrigaria `.js` em todos os imports e não traz benefício, pois nada roda a saída do `tsc` diretamente: a API roda via `tsx` ou bundle).

### D5. TypeScript: `tsconfig.base.json` estrito + um `tsconfig` por pacote
Base: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, `verbatimModuleSyntax`, `skipLibCheck`, `target ES2023`, `noEmit`. Cada pacote estende a base e ajusta `lib`/`types` (web usa `DOM` e os tipos de Svelte/Vite; api e shared usam `node`). `exactOptionalPropertyTypes` fica de fora por atrito com libs. O web **não** usa `@tsconfig/svelte` (evita dependência para poucas linhas). O web precisa de **`allowJs: true`** no `tsconfig`: sem isso o `svelte-check` acusa TS7016 ("Could not find a declaration file for module ./App.svelte"), pois resolve imports `.svelte` de um jeito que o TypeScript trata como módulo JS (descoberto na tarefa 3.2; o `tsconfig` gerado pelo SvelteKit também o habilita). Não ativa `checkJs`, então nenhum JS passa a ser verificado.

### D6. ESLint 10 (flat config) único na raiz, sem type-aware por ora
`eslint.config.js` combina: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-svelte` (com parser TS nos `<script lang="ts">`), `globals` (node para api/shared/configs, browser para web) e `eslint-config-prettier` por último. `no-console: error` em `src/` (alinha com a Definition of Done e o uso de pino). Ignora `dist`, `node_modules`, `apps/api/drizzle`, `coverage`, artefatos do Cypress. **Alternativa**: `recommendedTypeChecked` (pega `no-floating-promises`, útil com Express), mas é mais lento e complica a configuração com Svelte; fica como candidato a revisão após a T2.

### D7. Prettier: estilo simples e arquivos gerados/planejamento ignorados
`singleQuote`, `semi`, `trailingComma: all`, `printWidth: 100`, `prettier-plugin-svelte`. `.prettierignore`: `node_modules`, `dist`, `coverage`, `package-lock.json`, `apps/api/drizzle`, `openspec`, `.claude` e `*.md` (evita reformatar os documentos de planejamento, que serão traduzidos em commit próprio). `data/products.json` **é** formatado.

### D8. Scripts (todos multiplataforma, sem sintaxe de shell)
- **Raiz**: `lint` = `eslint .`; `typecheck`/`test`/`build` = `npm run <x> --workspaces --if-present`; `format` = `prettier --write .`; `dev` = `concurrently` rodando os `dev` de api e web. A ordem em `workspaces` é `shared`, `api`, `web`.
- **api**: `dev` = `tsx watch src/server.ts`; `build` = `tsup`; `typecheck` = `tsc --noEmit`; `test` = `vitest run --passWithNoTests`; `db:generate` = `drizzle-kit generate` (o nome da primeira migration é passado uma única vez na geração: `-- --name init_products`).
- **web**: `dev` = `vite`; `build` = `vite build`; `typecheck` = `svelte-check --tsconfig ./tsconfig.json`; `test` = `vitest run --passWithNoTests`.
- **shared**: `typecheck` e `test`.
- Fora daqui: `start` e `test:e2e` (T7). **Alternativa** ao `concurrently` no `dev`: `npm-run-all2` (exige Node `^22.22 || ^24.15`, mais restrito) ou scripts manuais em dois terminais (pior DX).

### D9. Vitest: `node` na API e no shared, `jsdom` no web
- **api/shared**: `environment: 'node'`, `include: ['src/**/*.test.ts']`.
- **web**: configuração dentro do `vite.config.ts` (bloco `test`), `environment: 'jsdom'`, plugin do Svelte + `svelteTesting()` de `@testing-library/svelte/vite`, `setupFiles` com `@testing-library/jest-dom/vitest`.
- Como não há testes na T1, a configuração é validada com um **teste descartável** (renderiza `App.svelte`), executado e removido antes de fechar a tarefa. **Alternativa**: manter um smoke test permanente; descartada por contrariar "sem testes ainda" e por acrescentar código que não é da tarefa.

### D10. SPA placeholder
`index.html`, `src/main.ts` (monta o componente com a API do Svelte 5), `src/App.svelte` (um `<h1>` com o título) e `src/vite-env.d.ts`. Sem `svelte.config.js` a menos que a verificação exija (Svelte 5 aceita TypeScript apenas com tipos nos `<script lang="ts">`). Cypress: `apps/web/cypress.config.ts` com `baseUrl` `http://localhost:3000` (padrão do guia, sobrescrevível por variável), `cypress/e2e/.gitkeep` e `cypress/tsconfig.json`; sem specs.

### D11. Schema do banco (`apps/api/src/db/schema.ts`) com defesa em profundidade
Tabela `products` conforme a seção 5 do guia, e além dela **CHECK constraints** para `price_cents >= 0`, `stock >= 0` e `weight > 0`, índice `products_category_idx` em `category`, `sku` com `UNIQUE`, e `created_at`/`updated_at` com **default** `strftime('%Y-%m-%dT%H:%M:%fZ','now')` (formato do template: ISO 8601 UTC com milissegundos e `Z`). O banco é a última linha de defesa mesmo que a camada de validação falhe. **Alternativa**: apenas `NOT NULL`/`UNIQUE`, delegando limites à aplicação; descartada por ser menos robusta e barata de evitar. `updated_at` **não** tem gatilho: a aplicação o atualiza no PATCH (T3).
- `drizzle.config.ts`: dialect `sqlite`, schema em `./src/db/schema.ts`, saída `./drizzle`. `drizzle-kit generate` não precisa de conexão com banco.
- Primeira migration gerada com `--name init_products` → `apps/api/drizzle/0000_init_products.sql` mais a pasta `meta/` (journal e snapshot), tudo versionado, pois o migrator em runtime (T2) depende deles.

### D12. Data set: 44 produtos fictícios em inglês
`data/products.json` com **44 produtos**, 6 categorias (`automotive`, `dimensional-travel`, `energy`, `tools`, `communication`, `safety`), marcas fictícias (ACME e outras 3), SKUs `<MARCA>-<FAMÍLIA>-<NNN>`, IDs 1..44 sequenciais. Os itens 1 e 2 reproduzem **exatamente** os do PDF (descrição sem as barras de continuação de linha do PDF). Preços com 2 casas, pesos com até 2 casas, ao menos um `stock` 0, `updatedAt >= createdAt`. Termos como "flux", "dimensional" e "capacitor" se repetem entre itens para tornar a busca demonstrável. Nenhum texto contém `%` ou `_` (os testes de escape de `LIKE` da T2 usam fixtures próprias). O arquivo é escrito à mão e validado por script **descartável** (não versionado). **Alternativa**: gerar por script versionado; descartada, pois seria código fora do escopo e o dado é estático.

### D13. `.gitignore` e `.env.example`
`.gitignore`: `node_modules`, `dist`, `coverage`, `.env`, `data/*.db`, `data/*.db-wal`, `data/*.db-shm`, `apps/web/cypress/screenshots`, `apps/web/cypress/videos`, `*.tsbuildinfo`, `*.log`, `.vite`, arquivos de SO. **Não** ignora `.env.example` nem `data/products.json`. `.env.example` lista somente variáveis que a T2 vai consumir: `NODE_ENV`, `PORT` (3000), `DATABASE_PATH` (`./data/app.db`) e `LOG_LEVEL` (info); as de rate limit entram com a T4 (não documentar variáveis que nada lê).

### D14. Onde cada dependência entra
- **Raiz (dev)**: `typescript`, `@types/node`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`, `eslint-config-prettier`, `globals`, `prettier`, `prettier-plugin-svelte`, `concurrently`.
- **shared**: dep `zod`; dev `vitest`.
- **api**: deps `express`, `drizzle-orm`, `@libsql/client`, `zod`, `pino`, `pino-http`, `express-rate-limit`, `@vynyl/shared`; dev `drizzle-kit`, `tsx`, `tsup`, `vitest`, `supertest`, `@types/express`, `@types/supertest`.
- **web**: deps `svelte`, `@vynyl/shared`; dev `vite`, `@sveltejs/vite-plugin-svelte`, `svelte-check`, `vitest`, `jsdom`, `@testing-library/svelte`, `@testing-library/jest-dom`, `cypress`.
- Todas justificadas pelo guia (seção 2), exceto `tsup`, `tsx`, `concurrently` e `globals` (D3, D8, D6). Router de SPA e demais libs de UI **não** entram (T5).

### D15. Estratégia de verificação (o que "pronto" significa)
1. **Clone limpo simulado**: copiar a árvore de trabalho, sem `node_modules`, `dist` e bancos, para a pasta temporária e rodar `npm install` nela (o agente não commita, então um `git clone` real não contém as mudanças).
2. Rodar `npm run lint`, `typecheck`, `test`, `build` e `format` (idempotente) e conferir código de saída 0.
3. **Prova de fiação do `shared`** (temporária, revertida): importar `@vynyl/shared` a partir da API (`tsx`, `tsup` com bundle, Vitest) e do web (Vite, Vitest, `svelte-check`).
4. **Teste descartável do web** (D9) para provar Vitest + jsdom + Testing Library + Svelte 5.
5. **Migration**: aplicar `0000_init_products.sql` em SQLite temporário e sondar cada requisito da spec `product-database-schema` (unicidade, CHECKs, índice via `pragma index_list`, default de timestamps); rodar `db:generate` de novo e confirmar "sem mudanças".
6. **Data set**: script descartável verifica cada requisito da spec `product-dataset`.
7. **Dev**: iniciar o `dev` do web, requisitar a página por HTTP, confirmar o título e encerrar o processo.
8. Registrar honestamente o que **não** foi possível verificar (ex.: Linux/macOS, Node 22).

### D16. Driver SQLite: `@libsql/client` em vez de `better-sqlite3`
Decisão do usuário após o achado da tarefa 3.1. **Problema**: `better-sqlite3@13` contém um `binding.gyp` e declara `gypfile: false` para evitar compilação, mas o npm **ignora** esse campo ao instalar a partir do `package-lock.json` (o lockfile não o registra) e executa `node-gyp rebuild`, que falha sem Python e toolchain C++. Reproduzido com um lockfile gerado por instalação normal e `npm ci` numa pasta contendo só `package.json` + lockfile: **falha**; `better-sqlite3@12.11.1` (usa `prebuild-install`) e `@libsql/client@0.18.0` **instalam**, inclusive com o cache do npm vazio.
- **Decisão**: `@libsql/client` com `drizzle-orm/libsql`: sem `node-gyp`, sem download de binários do GitHub (vêm por pacotes npm por plataforma) e sem `prebuild-install` (avisa que não é mais mantido).
- **Alternativas**: `better-sqlite3@12` (mudança mínima, mas depende do download no GitHub Releases e de um pacote sem manutenção); `--ignore-scripts` no `.npmrc` (evita a compilação, mas desliga também o download do binário do Cypress).
- **Consequências**: (a) acesso a dados **assíncrono** (repositories retornam Promises, a partir da T2); (b) o client recebe uma **URL** (`file:./data/app.db`, `:memory:` nos testes), então a T2 converte `DATABASE_PATH`; (c) o SQLite embutido no libsql é 3.45.1 (o do better-sqlite3 v13 é 3.53), suficiente para CHECK, índices, `strftime` e WAL; (d) **o singleflight continua sem efeito real**: medido no scratchpad, 5 requests em tarefas distintas do event loop executaram a query 5 vezes (0 coalescidas), pois a query roda na thread principal; só chamadas no mesmo tick coalescem (ver `PROJECT_GUIDE.md`, seção 11.3).

## Risks / Trade-offs

- **Versões muito novas divergem em peers** (ex.: TypeScript 7) → fixar TS `~6.0.3`, checar peers antes de instalar, proibir `--force`/`--legacy-peer-deps`, e o lockfile reproduz o resultado.
- **Defaults do TypeScript 6 diferentes do 5.x** → `tsconfig` explícitos (`types`, `module`, `moduleResolution`, `target`); validar no primeiro `typecheck`.
- **Vitest 5 + Vite 8 + Testing Library + Svelte 5 sem uso prévio neste projeto** → teste descartável (D9/D15) antes de dar a tarefa por concluída.
- **Node 22 declarado mas não exercitado** → mencionar no relatório e no README (T8); `engines` apenas avisa, não bloqueia.
- **Peso do `npm install` por causa do binário do Cypress** (baixado no pós-instalação) → medir tempo/tamanho na verificação; documentar no README (T8) a alternativa `CYPRESS_INSTALL_BINARY=0` para quem só quer rodar a aplicação e `npx cypress install` depois para o e2e.
- **`tsup` externaliza `dependencies` por padrão** → `noExternal: ['@vynyl/shared']` explícito; verificar que `dist/server.js` não contém imports de `@vynyl/shared`.
- **`tsup` não é o sucessor recomendado** (existe `tsdown`, mais novo e ainda 0.x) → `tsup` não está descontinuado e só empacota; trocável depois sem impacto.
- **Validação apenas em Windows** → scripts sem sintaxe de shell reduzem o risco; Linux/macOS declarados como não verificados.
- **`npm test` executa workspaces em sequência** → aceitável nesta escala; sem paralelização.
- **Placeholders (`export {}`) e `.gitkeep`** → não contêm lógica; devem ser substituídos pelas tarefas seguintes.
- **Instalação a partir do lockfile só é validada de verdade com `npm ci`** (a falha do `better-sqlite3` v13 não aparecia numa instalação do zero) → a verificação 7.1 usa `npm ci` com cache do npm vazio e confere que nada é compilado.
- **Lockfile gerado sobre um `node_modules` existente pode omitir os binários opcionais de outras plataformas** (observado no scratchpad) → o lockfile é gerado do zero (sem `node_modules` e sem lockfile prévio), e as entradas de Linux e macOS são conferidas.
- **`@libsql/client` traz também código de acesso remoto (`@libsql/hrana-client`)** → só o modo local (`file:` / `:memory:`) é usado; o tamanho extra é aceito.

## Open Questions

- **Resolução de `DATABASE_PATH` relativo** (relativo ao cwd ou à raiz do repositório) e localização da pasta `drizzle/` em runtime quando a API estiver empacotada: decisões da T2/T7; `.env.example` já usa `./data/app.db`; o `@libsql/client` recebe uma URL `file:`, e a conversão do caminho para URL é feita na T2.
- **`baseUrl` do Cypress** e forma de subir o servidor no `test:e2e`: decididos na T7; a T1 apenas define o padrão `http://localhost:3000`.
