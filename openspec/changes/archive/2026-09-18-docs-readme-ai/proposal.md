# Proposal

## Why

O código está pronto (T1–T7), mas o enunciado avalia tanto quanto o código a **comunicação**: um `README.md` que leve um avaliador de um clone a uma página funcionando, com premissas, decisões de produto, questões em aberto, a feature extra e o que ficou de fora, e um `AI.md` com a narrativa honesta do trabalho com IA. Hoje o `README.md` tem só o título e o `AI.md` é um registro corrido. A T8 escreve os dois documentos finais e confere o resultado seguindo o próprio README em um clone limpo.

## What Changes

- **`README.md`** (inglês) conforme a seção 14 do guia: visão geral, requisitos (Node), como rodar e testar (`npm install`, `npm start`, URL), scripts, estrutura, resumo da API e do formato de erro, **decisões de produto**, **premissas**, **questões em aberto**, **feature extra** (problema, quem usa, por quê, e a limitação do singleflight com SQLite local), como a qualidade foi tratada, **o que ficou de fora e próximos passos** (e2e/Cypress, opcionais da API, GitHub Actions, helmet/CORS, autenticação, etc.) e problemas conhecidos de instalação.
- **`AI.md`** (inglês) reescrito como narrativa final, a partir do registro atual: fluxo (planejamento → OpenSpec → tarefas com checkpoints), ferramentas, o que funcionou bem e mal, notas por tarefa, e o que não foi verificado.
- **Verificação em clone limpo**: `git clone` para um caminho curto, seguir o README passo a passo (`npm install`, `npm start`), conferir a aplicação e rodar `lint`, `typecheck` e `test`; conferir o `DELIVERABLES.md` item a item.

**Fora de escopo**: código novo (salvo correção de algo que a verificação revele), traduzir os documentos de planejamento (o usuário faz isso em um commit próprio no fim), o registro da sessão de código (vídeo ou trace) e o link do GitHub, que são entregas do usuário.

## Capabilities

### New Capabilities

- `project-documentation`: o que o `README.md` e o `AI.md` finais precisam conter e a regra de que as instruções do README funcionam em um clone limpo.

### Modified Capabilities

Nenhuma.

## Impact

- **Arquivos**: `README.md`, `AI.md`, `DELIVERABLES.md` (conferência dos itens) e `OPENSPEC_TASKS.md`. Nenhum código de aplicação.
- **Riscos**: o README afirmar algo que o código não faz. Mitigação: cada afirmação técnica do README é conferida no código, nas specs ou rodando o comando; e o que não foi verificado é dito como tal.
