# Spec Delta

## Purpose

Garantir que quem recebe o repositório consiga rodá-lo, entender as decisões e as limitações e enxergar como o trabalho foi feito com IA, apenas lendo o `README.md` e o `AI.md`.

## ADDED Requirements

### Requirement: README que leva a uma página funcional
O `README.md` SHALL estar em inglês e SHALL ensinar, sem passos ocultos, a chegar de um clone limpo a uma página funcional: versão do Node exigida, `npm install`, `npm start` e o endereço `http://localhost:3000`, além de como rodar os testes, o modo de desenvolvimento e como reiniciar o banco. As instruções SHALL funcionar em Windows, Linux e macOS.

#### Scenario: Seguir o README em um clone limpo
- **WHEN** alguém clona o repositório e executa somente os comandos do README, na ordem
- **THEN** a API e a SPA sobem em `http://localhost:3000` e os testes, o lint e o typecheck do README passam

### Requirement: Conteúdo exigido pelo enunciado
O `README.md` SHALL conter seções distintas para: visão geral; como rodar e testar; estrutura do repositório; a API (rotas e formato de erro); **decisões de produto**; **premissas**; **questões em aberto**; a **feature extra** (o problema que resolve, quem a usaria, por que foi escolhida e a limitação do singleflight com SQLite local); e **o que ficou de fora e os próximos passos**.

#### Scenario: Itens do DELIVERABLES cobertos
- **WHEN** o `DELIVERABLES.md` é conferido item a item contra o `README.md` e o `AI.md`
- **THEN** cada item do README e do AI.md aparece atendido, ou explicitamente justificado como não feito

### Requirement: Honestidade sobre o que não foi feito ou verificado
O `README.md` SHALL listar como não feitos os testes e2e (Cypress), os endpoints opcionais (ordenação e categorias), o GitHub Actions, o `helmet`/CORS restrito e a autenticação, e SHALL dizer que o singleflight não coalesce consultas com o SQLite local. Nenhuma afirmação do README SHALL descrever um comportamento que o código não tem.

#### Scenario: Cortes de escopo
- **WHEN** o leitor procura o que não foi implementado
- **THEN** encontra cada item acima, com o motivo e o que seria feito a seguir

### Requirement: AI.md com narrativa e avaliação
O `AI.md` SHALL estar em inglês e SHALL conter a narrativa do fluxo de trabalho com codificação assistida por IA (planejamento, OpenSpec, tarefas com checkpoints de revisão), as ferramentas usadas, o que funcionou bem, o que funcionou mal ou exigiu correção e o que não foi verificado, sem repetir os detalhes técnicos que já estão no código, nas specs e no histórico de commits.

#### Scenario: Leitura do AI.md
- **WHEN** um avaliador lê o `AI.md`
- **THEN** entende como as decisões foram tomadas, onde a IA errou ou precisou de correção e como isso foi detectado
