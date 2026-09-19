# product-detail Specification

## Purpose
Show all of a product's information on a screen of its own, with the paths to edit it, delete it and go back to the catalog, and clearly handle the nonexistent product and failures.

## Requirements

### Requirement: Detail of a product
On opening `/products/:id`, the SPA SHALL ask the API for the product and display its title (as the page's main heading), description, category, brand, SKU, price, stock, weight and the creation and last update dates. The screen SHALL offer the "Back to products" link (to `/`), the "Edit" link (to `/products/:id/edit`) and the "Delete" button.

#### Scenario: Existing product
- **WHEN** the user opens `/products/1` and the API returns product 1
- **THEN** the screen shows all of the product's fields, the "Back to products" link, the "Edit" link pointing to `/products/1/edit` and the "Delete" button

#### Scenario: Arrival from the list
- **WHEN** the user activates a product's title in the dashboard list
- **THEN** the SPA opens that product's detail without reloading the page

### Requirement: Detail states
While the response has not arrived, the screen SHALL show a loading indicator. If the request fails, it SHALL show an error message announced to assistive technologies (`role="alert"`), with no technical details, with the "Try again" action, which repeats the same request. If the product does not exist (`404` `PRODUCT_NOT_FOUND`), it SHALL show the message "Product not found" with the "Back to products" action.

#### Scenario: Loading
- **WHEN** the response has not arrived yet
- **THEN** the screen shows the loading indicator

#### Scenario: Failure and retry
- **WHEN** the request fails and the user activates "Try again"
- **THEN** the same request is made again and, on success, the product appears

#### Scenario: Nonexistent product
- **WHEN** the API responds `404` with `PRODUCT_NOT_FOUND`
- **THEN** the screen shows "Product not found" and the "Back to products" action, which leads to `/`

### Requirement: Only the most recent result is displayed
When switching the displayed product or leaving the screen, the SPA SHALL cancel the in-flight request and SHALL ignore any response that is not that of the most recent request.

#### Scenario: Product switch with a late response
- **WHEN** the user goes from product 1 to product 2 and product 1's response arrives later
- **THEN** the screen shows only product 2
