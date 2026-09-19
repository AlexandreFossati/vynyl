# Spec Delta

## Purpose

Give the user an overview of the catalog on the home screen, with search and pagination, at any screen size.

## ADDED Requirements

### Requirement: Initial listing
On opening `/`, the dashboard SHALL ask the API for the first page (`limit=30`, `offset=0`, no `q`) and list the products received. Each product SHALL show title, brand, category, price and stock; the SKU SHALL appear from 1024 px of width.

#### Scenario: First page
- **WHEN** the user opens the home screen and the API returns products
- **THEN** the list shows those products with title, brand, category, price and stock

### Requirement: Debounced search
The search field SHALL wait 300 ms without typing before triggering the search. The search SHALL use the text without surrounding spaces as `q`, SHALL omit `q` when the text is empty, SHALL limit the text to 100 characters and SHALL go back to page 1.

#### Scenario: Fast typing generates one search
- **WHEN** the user types several letters in sequence, each in less than 300 ms
- **THEN** a single request is made, after the last key, with the full text in `q`

#### Scenario: Back to the first page
- **WHEN** the user is on page 2 and changes the search
- **THEN** the new request uses `offset=0`

#### Scenario: Empty search
- **WHEN** the user erases the search text
- **THEN** the request does not contain `q`

### Requirement: Pagination of 30 per page
The dashboard SHALL display 30 products per page, the "Previous" and "Next" controls and the displayed range (for example, "Showing 1–30 of 44"). "Previous" SHALL be disabled on the first page and "Next" on the last. Changing page SHALL ask the API with the corresponding `offset`.

#### Scenario: Next page
- **WHEN** the user is on page 1 of a 44-product catalog and activates "Next"
- **THEN** the request uses `offset=30` and the text shows "Showing 31–44 of 44"

#### Scenario: Limits
- **WHEN** the user is on the first or the last page
- **THEN** "Previous" or "Next", respectively, is disabled

### Requirement: Loading, empty and error states
The dashboard SHALL show a loading indicator while waiting for the first response, an empty message when the search finds no products (with the "Clear search" action when there is search text) and an error message with the "Try again" action when the request fails. "Try again" SHALL repeat the same request. The error SHALL be announced to assistive technologies (`role="alert"`) and SHALL NOT display technical details.

#### Scenario: Loading
- **WHEN** the first response has not arrived yet
- **THEN** the screen shows the loading indicator

#### Scenario: No results
- **WHEN** the search finds no product
- **THEN** the screen shows the empty message and the "Clear search" action, which clears the search and reloads the list

#### Scenario: Failure and retry
- **WHEN** the request fails and the user activates "Try again"
- **THEN** the same request is made again and, on success, the list appears

### Requirement: Only the most recent result is displayed
When starting a new request, the dashboard SHALL cancel the previous one, and SHALL ignore any response that is not that of the most recent request. During reloads after the first, the previous list SHALL remain visible and marked as busy (`aria-busy`).

#### Scenario: Out-of-order responses
- **WHEN** two searches are triggered in sequence and the first one's response arrives after the second's
- **THEN** the list shows only the second's result

### Requirement: Table on desktop and cards on mobile
The list SHALL be displayed as cards below 640 px and as a table from 640 px; the table SHALL have a caption and column headers for assistive technologies, and SHALL display the brand and SKU columns only from 1024 px. Only one of the two presentations SHALL be visible and accessible at a time.

#### Scenario: Mobile
- **WHEN** the width is 360 px
- **THEN** the products appear as cards, with no visible table

#### Scenario: Desktop
- **WHEN** the width is 1280 px
- **THEN** the products appear in a table with the brand and SKU columns

### Requirement: Price and stock presentation
The price SHALL be displayed as currency (dollar, two decimal places). The stock SHALL be displayed with a badge: `Out of stock` when it is 0, `Low stock` when it is between 1 and 10 and `In stock` above 10, always with the number of units and without relying on color alone.

#### Scenario: Stock bands
- **WHEN** the stock is 0, 10 and 11
- **THEN** the badges are `Out of stock`, `Low stock` and `In stock`, respectively

#### Scenario: Price
- **WHEN** the price is `1299`
- **THEN** the displayed text is `$1,299.00`

### Requirement: Basic accessibility
The search field SHALL have an associated label, the result count SHALL be announced by an `aria-live="polite"` region and all controls SHALL be operable by keyboard.

#### Scenario: Search label
- **WHEN** a screen reader reads the search field
- **THEN** it is identified as "Search products"
