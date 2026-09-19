# Spec Delta

## Purpose

Give short, accessible feedback on the outcome of the user's actions (success or error) without taking them off the screen they are on.

## ADDED Requirements

### Requirement: Success and error toasts
The SPA SHALL display short messages (toasts) of success or error in an `aria-live="polite"` region present on all screens; error toasts SHALL have `role="alert"`. More than one toast SHALL be able to be visible at the same time. Toasts SHALL survive navigation between screens (for example, the "Product created" toast already appears on the product detail page).

#### Scenario: Success message
- **WHEN** an action finishes successfully
- **THEN** the toast with the message appears in the `aria-live` region

#### Scenario: Error message
- **WHEN** an action fails
- **THEN** the toast appears with `role="alert"`

#### Scenario: Survives navigation
- **WHEN** the action navigates to another screen right after showing the toast
- **THEN** the toast remains visible on the new screen

### Requirement: Closing toasts
Each toast SHALL close by itself after some time (5 s for success, 8 s for error) and SHALL be closable by the user with the "Dismiss notification" button, operable by keyboard.

#### Scenario: Automatic closing
- **WHEN** 5 s pass since a success toast was displayed
- **THEN** the toast disappears

#### Scenario: Manual closing
- **WHEN** the user activates "Dismiss notification" on a toast
- **THEN** only that toast disappears
