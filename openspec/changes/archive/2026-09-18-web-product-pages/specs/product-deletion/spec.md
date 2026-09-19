# Spec Delta

## Purpose

Allow deleting a product from the detail page, with an explicit confirmation that prevents accidental removal and is usable by keyboard and screen reader.

## ADDED Requirements

### Requirement: Confirmation before deleting
When activating "Delete" on the detail page, the SPA SHALL open a modal dialog with the title "Delete product?", the product's name, and the actions "Delete" (confirm) and "Cancel". No removal request SHALL be made before confirmation. "Cancel" SHALL close the dialog without removing anything.

#### Scenario: Open the dialog
- **WHEN** the user activates "Delete" on a product's detail page
- **THEN** the dialog appears with the title "Delete product?" and the product's name, and no removal request has been made

#### Scenario: Cancel
- **WHEN** the user activates "Cancel"
- **THEN** the dialog closes, the product stays on screen and no removal request is made

### Requirement: Focus and keyboard in the dialog
The dialog SHALL be modal: on opening, the initial focus SHALL be on "Cancel" (the safe action), focus SHALL stay inside the dialog while it is open and SHALL return to the button that opened it on closing. The Esc key SHALL cancel the dialog, except while removal is in progress. The dialog SHALL have an accessible name (the title) and SHALL take up the whole screen below 640 px.

#### Scenario: Esc cancels
- **WHEN** the dialog is open and the user presses Esc
- **THEN** the dialog closes without removing the product and focus returns to the page's "Delete" button

#### Scenario: Initial focus
- **WHEN** the dialog opens
- **THEN** focus is on "Cancel"

#### Scenario: Reopen after Esc
- **WHEN** the user closes the dialog with Esc and activates "Delete" again
- **THEN** the dialog opens again

#### Scenario: Trapped focus
- **WHEN** the user presses Tab more times than the dialog has controls
- **THEN** focus never goes to a page control behind it

### Requirement: Delete
On confirming, the SPA SHALL remove the product in the API. During removal, the dialog's actions SHALL be disabled. On success (`204`), it SHALL show the toast "Product deleted" and navigate to `/`. If the API responds `404` `PRODUCT_NOT_FOUND`, it SHALL show an error toast saying the product no longer exists and navigate to `/`. Any other failure SHALL close the dialog, show an error toast with no technical details and keep the user on the detail page.

#### Scenario: Successful deletion
- **WHEN** the user confirms and the API responds `204`
- **THEN** the toast "Product deleted" appears and the SPA opens `/`

#### Scenario: Removal in progress
- **WHEN** the user confirms and the response has not arrived yet
- **THEN** the dialog's actions are disabled and Esc does not close the dialog

#### Scenario: Product already removed
- **WHEN** the API responds `404` `PRODUCT_NOT_FOUND` to the removal
- **THEN** an error toast appears and the SPA opens `/`

#### Scenario: Removal failure
- **WHEN** removal fails due to a network error or `5xx`
- **THEN** the dialog closes, an error toast appears and the product detail page stays on screen
