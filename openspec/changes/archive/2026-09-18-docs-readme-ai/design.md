# Design

## Context

Só documentação. Fontes: `PROJECT_GUIDE.md` (decisões, seção 14 diz o que o README e o AI.md devem conter), `DELIVERABLES.md` (checklist do PDF), as specs em `openspec/specs` (comportamento real) e o código. Os documentos de planejamento continuam em português por ora; o usuário os traduz em um commit final. Os entregáveis (`README.md`, `AI.md`) são em inglês.

## Goals / Non-Goals

**Goals:** README que leva ao app rodando e comunica decisões, premissas, questões em aberto, feature extra e cortes; AI.md como narrativa; tudo conferido contra o código.
**Non-Goals:** código novo, traduzir documentos de planejamento, gravar/exportar o registro da sessão, criar o repositório no GitHub.

## Decisions

### D1. Todo fato técnico do README vem de uma fonte conferível
Versões, portas, variáveis de ambiente, rotas, códigos de erro, limites e comportamentos são copiados do código, de `.env.example`, das specs ou de um comando executado, e não da memória. Números que mudam a cada commit (quantidade de testes) **não** entram no README.

### D2. Estrutura do README (nesta ordem)
1. Visão geral. 2. Como rodar (pré-requisitos, `npm install`, `npm start`, endereço, reiniciar o banco). 3. Desenvolvimento e testes (`npm run dev`, tabela de scripts, o que os testes cobrem). 4. Estrutura do repositório. 5. API (rotas, paginação, busca, formato de erro). 6. Decisões de produto. 7. Premissas. 8. Questões em aberto. 9. Feature extra: resiliência e escala (problema, quem, por quê, a limitação medida). 10. Qualidade e segurança (o que foi feito). 11. O que ficou de fora e próximos passos. 12. Problemas conhecidos de instalação. 13. Como foi feito (AI.md e documentos de planejamento). O README fica curto o bastante para ler em poucos minutos: detalhes finos ficam nas specs.

### D3. Cortes ditos com motivo e próximo passo
Cada item não feito aparece com o motivo e o que seria feito: e2e/Cypress (pouco tempo; o diretório `cypress` e a dependência existem, sem specs), opcionais da API (ordenação e categorias), GitHub Actions (lista dos jobs que existiriam), `helmet`/CORS restrito, autenticação, `NODE_ENV=production` no `npm start`, banco em rede para o singleflight ter efeito real.

### D4. AI.md como narrativa, sem duplicar o histórico
Reescrito a partir do registro atual: fluxo em fases, o que funcionou bem e mal (mantendo os itens de T1/T2), uma nota por tarefa (T3–T7) e uma seção "Not verified" com os limites (um navegador, sem leitor de tela, sem e2e). Sem detalhes técnicos que o código, as specs e os commits já registram.

### D5. Verificação
Em um clone limpo (caminho curto, por causa do limite de caminho do Windows citado na T1), seguir o README **literalmente**: `npm install` (não `npm ci`, que é o que o README manda), `npm start`, abrir a página por `curl`, e depois `npm run lint`, `npm run typecheck` e `npm test`. Como o clone vem do `HEAD`, o README e o AI.md ainda não commitados são copiados para dentro dele; nenhum código muda. O `DELIVERABLES.md` é conferido item a item e os itens que só o usuário pode cumprir (link do GitHub, registro da sessão) ficam abertos e ditos como tal.

## Risks / Trade-offs

- **README desatualizar** se o código mudar → ele descreve contratos estáveis e remete às specs para o detalhe.
- **`npm install` no clone pode alterar o lockfile** → conferir `git status` no clone depois; se alterar, é um achado a reportar.
- **A renderização no navegador** já foi conferida pelo usuário na T7; o README não promete mais que isso.

## Migration Plan

Sem migração. Reversão: reverter o commit.

## Open Questions

Nenhuma.
