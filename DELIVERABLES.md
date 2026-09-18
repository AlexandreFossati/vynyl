# Entregáveis — Teste Vynyl (Fullstack)

Extraído de `requirements.pdf`. Tempo sugerido: **60–90 min** (não é cronometrado; se algo ficar incompleto, explicar o que seria feito a seguir).

## 1. Entregáveis finais

- [ ] **Link para repositório no GitHub** contendo:
  - [ ] Código final (SPA + API)
  - [ ] `README.md`
  - [ ] `AI.md`
- [ ] **Registro da sessão de código**, um dos dois:
  - [ ] Vídeo de captura de tela da sessão de código, **ou**
  - [ ] Trace completo dos prompts e interações com agentes

## 2. `README.md`

Deve explicar:

- [ ] Como subir e rodar a solução (o avaliador vai clonar o repo e seguir as instruções até chegar a uma página web funcional)
- [ ] Premissas (assumptions)
- [ ] Questões em aberto (open questions)
- [ ] Outras informações que ajudem a entender o candidato como desenvolvedor
- [ ] **Decisões de produto** tomadas para esclarecer ou estender a especificação
- [ ] O que seria feito a seguir, caso alguma parte fique incompleta
- [ ] **Feature extra** (ver seção 7): problema que resolve, quem usaria, por que foi escolhida

## 3. `AI.md`

- [ ] Visão narrativa do fluxo de trabalho com codificação assistida por IA
- [ ] Notas sobre o que funcionou bem e o que funcionou mal durante o projeto

Obs.: é obrigatório usar ferramentas de codificação agêntica de preferência do candidato.

## 4. Requisitos gerais

- [ ] Construir uma **SPA** e uma **API**
- [ ] Deve rodar localmente. Opções aceitas: Docker + banco relacional, `npm start` + SQLite, serialização em JSON local, ou algo intermediário
- [ ] Tratar como um projeto que será usado para onboarding de outros desenvolvedores
- [ ] Sem templates fornecidos (escolhas livres)
- [ ] Stack sugerida (não obrigatória; se divergir, justificar):

| Stack | Frontend | Router/API | ORM |
|---|---|---|---|
| TypeScript | Svelte, React, etc. | Hono (opcional) | Preferido, ou nenhum |
| Python | Preferido | FastAPI (justificar se usar outro) | SQLAlchemy, ou nenhum |
| Laravel | Defaults | Defaults | Defaults |

## 5. Dados (data set)

Criar um data set seguindo o template abaixo (o PDF mostra 2 itens de exemplo e `{...}` para os demais):

```json
[
  {
    "id": 1,
    "title": "Large Flux Capacitor",
    "description": "The Large Flux Capacitor provides the maximum motive force for your inter-dimensional aluminum automobile.",
    "category": "automotive",
    "price": 9.99,
    "stock": 42,
    "brand": "ACME",
    "sku": "ACM-FC-001",
    "weight": 4,
    "meta": {
      "createdAt": "2025-04-30T09:41:02.053Z",
      "updatedAt": "2025-04-30T09:41:02.053Z"
    }
  }
]
```

Campos: `id`, `title`, `description`, `category`, `price`, `stock`, `brand`, `sku`, `weight`, `meta.createdAt`, `meta.updatedAt`.

Obs.: o JSON do PDF tem vírgulas finais em `meta` (inválido); o exemplo acima foi corrigido. O tamanho do data set não é especificado, mas "30 itens por padrão" na listagem sugere ao menos 30 produtos.

## 6. API

Incluir testes unitários e outros, GitHub Actions etc. ("do your normal thing").

### Endpoints obrigatórios

- [ ] Listar todos os produtos (**30 itens por padrão**)
- [ ] Obter um único produto
- [ ] Buscar produtos por nome ou descrição (match exato de string, case-insensitive, é suficiente)
- [ ] Adicionar produto (POST)
- [ ] Atualizar produto (PUT ou PATCH)
- [ ] Remover produto

### Endpoints opcionais

- [ ] Ordenação (sorting/ordering)
- [ ] Criar nova categoria de produto
- [ ] Listar todas as categorias de produto
- [ ] Obter a lista de categorias (category list)
- [ ] Listar produtos por categoria

## 7. SPA

- [ ] Interface que exercita a API, com escolhas de design razoáveis
- [ ] Exemplo sugerido: dashboard na home com resumos de todos os produtos, mais opções para ver detalhes, criar, editar e excluir produtos

## 8. Feature extra (não especificada)

Após concluir a especificação, adicionar **pelo menos uma** funcionalidade não especificada e explicar:

- [ ] Que problema ela resolve
- [ ] Quem a usaria
- [ ] Por que foi escolhida

## 9. O que será avaliado (critérios implícitos)

- Competência full stack
- Uso de ferramentas de codificação agêntica
- Como o candidato ganha entendimento do problema, aborda soluções e **explica o processo e os resultados**
- Comunicação (README, AI.md, decisões de produto e premissas)
