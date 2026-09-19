# product-dataset Specification

## Purpose

Define the contract of the initial product data set, in the format of the statement's template, that feeds the application and allows demonstrating pagination, search and filtering with realistic and valid data.

## Requirements

### Requirement: File format
The `data/products.json` file SHALL contain a valid JSON array (no trailing commas, no comments) of objects with exactly the template's fields: `id`, `title`, `description`, `category`, `price`, `stock`, `brand`, `sku`, `weight` and `meta` with `createdAt` and `updatedAt`.

#### Scenario: Strictly valid JSON
- **WHEN** the file is read by a strict JSON parser
- **THEN** reading completes without error and the result is an array of objects

#### Scenario: Exact template fields
- **WHEN** the keys of each product are inspected
- **THEN** each product has exactly the template's keys, with no missing or extra fields

### Requirement: Minimum volume
The data set SHALL contain at least 40 products, so that the default listing of 30 items produces more than one page.

#### Scenario: More than one page by default
- **WHEN** the products in the file are counted
- **THEN** the total is greater than or equal to 40

### Requirement: Unique identifiers and SKUs
The `id`s SHALL be sequential integers starting at 1, with no repetition or gaps. The `sku`s SHALL be unique, have between 3 and 40 characters and contain only uppercase letters, digits and hyphens.

#### Scenario: Sequential identifiers
- **WHEN** the `id`s are sorted
- **THEN** they form the sequence 1, 2, 3, ..., N with no gaps or duplicates

#### Scenario: Unique and well-formed SKUs
- **WHEN** the `sku`s are checked
- **THEN** there are no duplicates and all match `^[A-Z0-9-]{3,40}$`

### Requirement: Values within the business rules
Each product SHALL respect: `title` with 1 to 200 characters; `description` with 1 to 2000 characters; `category` in lowercase with 1 to 50 characters; `price` numeric greater than or equal to 0 with at most 2 decimal places; `stock` integer greater than or equal to 0; `brand` with 1 to 100 characters; `weight` numeric greater than 0. Texts SHALL NOT have spaces at the ends.

#### Scenario: All products valid
- **WHEN** each product is validated against the rules above
- **THEN** no product violates any rule

### Requirement: Coherent timestamps
`meta.createdAt` and `meta.updatedAt` SHALL be in ISO 8601 UTC format with milliseconds and the `Z` suffix, and `updatedAt` SHALL be greater than or equal to `createdAt` in every product.

#### Scenario: Valid and ordered timestamps
- **WHEN** each product's timestamps are checked
- **THEN** both match the expected format and `updatedAt` is not earlier than `createdAt`

### Requirement: Reference items from the statement
The first two products SHALL be the statement's examples: "Large Flux Capacitor" (`id` 1, category `automotive`, price 9.99, stock 42, brand `ACME`, SKU `ACM-FC-001`, weight 4) and "Medium Flux Capacitor" (`id` 2, category `automotive`, price 5.99, stock 42, brand `ACME`, SKU `ACM-FC-002`, weight 3.25), with the statement's descriptions and dates.

#### Scenario: Statement examples preserved
- **WHEN** the products with `id` 1 and 2 are read
- **THEN** their fields match the statement's values exactly

### Requirement: Diversity for demonstration
The data set SHALL contain at least 5 distinct categories and at least 3 distinct brands, and SHALL include at least one product with `stock` equal to 0 (a valid boundary value). The textual content SHALL be in English.

#### Scenario: Variety of categories and brands
- **WHEN** the distinct categories and brands are counted
- **THEN** there are at least 5 categories and 3 brands

#### Scenario: Stock boundary value present
- **WHEN** the `stock` values are inspected
- **THEN** there is at least one product with `stock` equal to 0
