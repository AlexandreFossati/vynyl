# Spec Delta

## Purpose

Dar à SPA uma base visual limpa, simples e responsiva, com uma única fonte de valores de design, para que todas as telas sejam consistentes e baratas de manter.

## ADDED Requirements

### Requirement: Tokens de design como única fonte
`styles/tokens.css` SHALL definir, como variáveis CSS, a paleta (neutros, uma cor de destaque e as cores semânticas de sucesso, alerta e perigo), a escala de espaçamento (4, 8, 12, 16, 24, 32 e 48 px), a escala tipográfica, os raios e as sombras. Os componentes SHALL usar esses tokens e SHALL NOT declarar cores literais nem valores de espaçamento fora da escala.

#### Scenario: Componentes sem cores literais
- **WHEN** os estilos dos componentes são inspecionados
- **THEN** nenhuma cor é declarada por valor literal (`#...`, `rgb(...)`, `hsl(...)`); todas vêm de `var(--...)`

### Requirement: Estilos base e fonte do sistema
`styles/base.css` SHALL aplicar um reset leve, a fonte do sistema (sem fontes externas), `box-sizing: border-box` e a escala tipográfica, e SHALL ser carregado uma vez na entrada da aplicação junto com os tokens.

#### Scenario: Sem dependências externas de fonte
- **WHEN** a página é carregada
- **THEN** nenhuma requisição a fontes ou folhas de estilo externas é feita

### Requirement: Mobile-first com dois breakpoints
O CSS base SHALL ser escrito para telas pequenas, e as adaptações SHALL usar `min-width` nos breakpoints de 640 px e 1024 px.

#### Scenario: Layout por largura
- **WHEN** a largura da janela é menor que 640 px, entre 640 e 1023 px, ou 1024 px ou mais
- **THEN** o layout usa, respectivamente, a variação mobile, a intermediária e a de desktop

### Requirement: Foco visível e alvos de toque
Todo elemento interativo SHALL mostrar um indicador de foco visível ao ser focado pelo teclado, e SHALL ter altura mínima de 44 px.

#### Scenario: Navegação por teclado
- **WHEN** o usuário percorre a página com a tecla Tab
- **THEN** cada controle focado exibe um contorno visível com contraste suficiente

#### Scenario: Alvo de toque
- **WHEN** um botão ou campo é renderizado
- **THEN** sua altura é de pelo menos 44 px

### Requirement: Contraste adequado
Os pares de cor de texto e fundo usados pelos componentes SHALL ter razão de contraste mínima de 4.5:1 (texto normal), e o contorno de foco de 3:1 contra o fundo.

#### Scenario: Pares de tokens
- **WHEN** a razão de contraste de cada par de texto/fundo declarado em `tokens.css` é calculada
- **THEN** todas atendem ao mínimo acima

### Requirement: Sem rolagem horizontal
Nenhuma tela SHALL produzir rolagem horizontal da página em larguras de 360, 768 e 1280 px.

#### Scenario: Larguras de referência
- **WHEN** o dashboard é exibido em 360, 768 e 1280 px de largura
- **THEN** a largura de rolagem do documento não excede a largura da janela
