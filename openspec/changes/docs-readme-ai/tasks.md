# Tasks

> Referências: `specs/project-documentation`; decisões em `design.md` (D1–D5); guia, seção 14; `DELIVERABLES.md`. Idioma: `README.md` e `AI.md` em **inglês**; estes artefatos em português. **Sem código novo**, sem dependências, sem traduzir os documentos de planejamento. Todo fato técnico do README vem do código, de `.env.example`, das specs ou de um comando executado. Sem e2e/Cypress (decisão do usuário).

## 1. Documentos

- [x] 1.1 Escrever o `README.md` (D2, D3). Verificar conferindo cada afirmação técnica contra a fonte (variáveis contra `.env.example` e `env.ts`, rotas e códigos contra as specs e o código, scripts contra o `package.json`) e rodando os comandos que ele manda executar.
- [x] 1.2 Reescrever o `AI.md` como narrativa final (D4). Verificar relendo contra o histórico de commits e as specs: nada afirmado que não aconteceu, e a seção de limites presente.

## 2. Verificação e fechamento

- [x] 2.1 Clone limpo (D5): clonar para um caminho curto, copiar README/AI.md/artefatos não commitados, seguir o README literalmente (`npm install`, `npm start` com banco temporário, `curl` da página, das rotas e da API), depois `npm run lint`, `npm run typecheck` e `npm test`; conferir `git status` do clone (lockfile) e apagar o clone. Declarar o que não foi verificável.
- [ ] 2.2 Conferir o `DELIVERABLES.md` item a item contra o repositório, marcar o que está atendido e deixar aberto, com o motivo, o que depende do usuário (link do GitHub, registro da sessão, opcionais da API, GitHub Actions). Marcar o T7 no "Status geral" do `OPENSPEC_TASKS.md` (o usuário conferiu no navegador) e refletir a T8. `npm run format` idempotente, `openspec validate docs-readme-ai --strict`, relatório final com o que **não** foi verificado.
