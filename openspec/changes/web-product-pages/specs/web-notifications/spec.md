# Spec Delta

## Purpose

Dar feedback curto e acessível sobre o resultado das ações do usuário (sucesso ou erro) sem tirá-lo da tela em que está.

## ADDED Requirements

### Requirement: Toasts de sucesso e de erro
A SPA SHALL exibir mensagens curtas (toasts) de sucesso ou de erro em uma região `aria-live="polite"` presente em todas as telas; toasts de erro SHALL ter `role="alert"`. Mais de um toast SHALL poder ficar visível ao mesmo tempo. Os toasts SHALL sobreviver à navegação entre telas (por exemplo, o toast de "Product created" aparece já no detalhe do produto).

#### Scenario: Mensagem de sucesso
- **WHEN** uma ação termina com sucesso
- **THEN** o toast com a mensagem aparece na região `aria-live`

#### Scenario: Mensagem de erro
- **WHEN** uma ação falha
- **THEN** o toast aparece com `role="alert"`

#### Scenario: Sobrevive à navegação
- **WHEN** a ação navega para outra tela logo depois de mostrar o toast
- **THEN** o toast continua visível na nova tela

### Requirement: Fechamento dos toasts
Cada toast SHALL fechar sozinho depois de um tempo (5 s para sucesso, 8 s para erro) e SHALL poder ser fechado pelo usuário com o botão "Dismiss notification", operável por teclado.

#### Scenario: Fechamento automático
- **WHEN** passam 5 s desde a exibição de um toast de sucesso
- **THEN** o toast desaparece

#### Scenario: Fechamento manual
- **WHEN** o usuário aciona "Dismiss notification" em um toast
- **THEN** somente esse toast desaparece
