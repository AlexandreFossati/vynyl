# Spec Delta

## Purpose

Ensure that, on startup, the API finds the database with the correct structure and the initial catalog data, automatically, repeatably and without duplicating data on restarts.

## ADDED Requirements

### Requirement: Migrations applied at startup
On startup, the API SHALL apply all pending migrations from the versioned `apps/api/drizzle/` folder before accepting connections. A new database SHALL receive the complete structure; an already migrated database SHALL remain unchanged.

#### Scenario: New database
- **WHEN** the API starts with a nonexistent database file
- **THEN** the file is created and the `products` table exists with its whole structure before the API responds

#### Scenario: Restart over a migrated database
- **WHEN** the API restarts over a database that already received the migrations
- **THEN** no migration is reapplied and the existing data remains intact

### Requirement: Idempotent initial seed
After the migrations, if the `products` table is empty, the API SHALL load `data/products.json` and insert all the products, preserving the file's `id`s and `createdAt`/`updatedAt` timestamps. If the table already has at least one product, the API SHALL NOT insert or change anything. After the seed, the next automatically generated `id` SHALL be greater than the largest `id` in the data set.

#### Scenario: First startup
- **WHEN** the API starts with an empty database and the 44-product data set
- **THEN** the table ends up with 44 products with the same `id`s, fields and timestamps as the file

#### Scenario: Restarts do not duplicate
- **WHEN** the API is restarted one or more times with the database already populated
- **THEN** the table still has exactly 44 products

#### Scenario: Next identifier
- **WHEN** a new product is inserted without an `id` after the seed
- **THEN** it receives `id` 45

### Requirement: Price converted to cents without floating-point error
On insertion, the file's decimal price SHALL be converted to exact integer cents.

#### Scenario: Problematic floating-point values
- **WHEN** the seed processes products with price `19.99`, `0.29` and `4.35`
- **THEN** 1999, 29 and 435 cents are stored, respectively

### Requirement: Invalid data set stops startup with no partial data
The content of `data/products.json` SHALL be validated against the product contract before any insertion. If there is any invalid product, malformed JSON, or uniqueness violation (repeated `id` or `sku`) during insertion, startup SHALL fail with an error that identifies the problem, and no product SHALL be inserted (atomic operation).

#### Scenario: Invalid product
- **WHEN** the data set contains a product with negative `stock`
- **THEN** startup fails indicating the invalid item and field, and the table remains empty

#### Scenario: Repeated SKU
- **WHEN** the data set contains two products with the same `sku`
- **THEN** startup fails and none of the file's products remain in the table

#### Scenario: Malformed JSON
- **WHEN** `data/products.json` is not valid JSON
- **THEN** startup fails with a message pointing to the file, and the table remains empty

### Requirement: Connection configuration
When opening the database, the API SHALL enable foreign keys and set a lock wait time (`busy_timeout`). For file databases, it SHALL also use the WAL journal mode.

#### Scenario: File database
- **WHEN** the API opens a file database
- **THEN** the journal mode is `wal`, foreign keys are enabled and `busy_timeout` is set

#### Scenario: In-memory database
- **WHEN** the API opens a `:memory:` database
- **THEN** opening completes without error, with foreign keys enabled
