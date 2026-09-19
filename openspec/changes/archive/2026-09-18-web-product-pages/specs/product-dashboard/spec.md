# Spec Delta

## ADDED Requirements

### Requirement: Access to detail and creation
Each product in the list SHALL have its title as a link to `/products/:id`, both in the cards and in the table. The dashboard SHALL offer the "Add product" link to `/products/new`, visible at all widths and also when the catalog is empty or the search finds nothing.

#### Scenario: Title leads to detail
- **WHEN** the user activates a product's title in the list
- **THEN** the SPA opens that product's detail

#### Scenario: Add product
- **WHEN** the user activates "Add product"
- **THEN** the SPA opens `/products/new`

#### Scenario: Empty catalog
- **WHEN** the catalog is empty or the search found nothing
- **THEN** the "Add product" link remains visible
