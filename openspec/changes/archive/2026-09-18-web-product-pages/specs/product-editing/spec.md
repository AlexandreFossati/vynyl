# Spec Delta

## Purpose

Allow creating and editing products through the interface with a single form, validated on the client with the same rules as the API and able to show, on the right field, the errors the server returns.

## ADDED Requirements

### Requirement: Shared create and edit form
`/products/new` SHALL show the empty form and `/products/:id/edit` SHALL load the product and show the same form filled with its values. The form SHALL have a field, with a visible label, for each of: title, description, category, price, stock, brand, SKU and weight. `id` and `meta` SHALL NOT appear. On edit, the loading, failure (with "Try again") and nonexistent product states SHALL be the same as on the detail page.

#### Scenario: Create
- **WHEN** the user opens `/products/new`
- **THEN** the form appears with all fields empty and the "Create product" action

#### Scenario: Edit
- **WHEN** the user opens `/products/1/edit` and the API returns product 1
- **THEN** the form appears filled with the product's values and the "Save changes" action

#### Scenario: Edit nonexistent product
- **WHEN** the API responds `404` `PRODUCT_NOT_FOUND` when loading the product
- **THEN** the screen shows "Product not found" and the "Back to products" action

### Requirement: Client-side validation with the shared schema
On submit, the form SHALL validate the values with the product creation schema from `@vynyl/shared` (the same rules as the API) before any request. Each invalid field SHALL show its message next to the field, the field SHALL be marked invalid (`aria-invalid`) and associated with the message (`aria-describedby`), and focus SHALL go to the first invalid field. A blank field SHALL show "Required"; price, stock and weight that are not numbers SHALL show a message of their own. No request SHALL be made while there is an error. Spaces at the ends of the texts SHALL be ignored.

#### Scenario: Submit with invalid fields
- **WHEN** the user submits the empty form
- **THEN** all required fields show "Required", no request is made and focus goes to the first field

#### Scenario: Product rules
- **WHEN** the user enters a price with three decimal places, negative stock, a category with uppercase letters or a SKU with lowercase letters
- **THEN** each field shows the message of the violated rule and no request is made

#### Scenario: Non-numeric value
- **WHEN** the user enters `abc` in the price
- **THEN** the price field shows a message asking for a number

#### Scenario: Valid values
- **WHEN** the user submits valid values (with spaces at the ends of the title)
- **THEN** the request is made with the converted and trimmed values

### Requirement: Create and save
When submitting valid values at `/products/new`, the SPA SHALL create the product in the API (`POST` with all fields). When submitting valid values at `/products/:id/edit`, it SHALL update it (`PATCH` with all fields). In both cases, on success, it SHALL show a success toast and navigate to the product's detail page (the newly created one, or the edited one). During submission, the submit button SHALL be disabled and indicate that it is saving, so that a second submission is not possible.

#### Scenario: Successful creation
- **WHEN** the user submits the valid create form and the API responds `201`
- **THEN** the toast "Product created" appears and the SPA opens `/products/<id of the new product>`

#### Scenario: Successful edit
- **WHEN** the user submits the valid edit form and the API responds `200`
- **THEN** the toast "Product updated" appears and the SPA opens the product's detail page

#### Scenario: Submission in progress
- **WHEN** the user submits the form and the response has not arrived yet
- **THEN** the submit button is disabled, indicates "Saving…" and a new click does not generate another request

### Requirement: Errors returned by the API
If the API responds `409` `SKU_CONFLICT`, the form SHALL show the message on the SKU field, keep all the typed values and move focus to the SKU. If it responds `400` `VALIDATION_ERROR` with `details`, it SHALL show each message on the corresponding field; a `path` that is not a form field SHALL become an error toast. Any other failure SHALL show an error toast with no technical details, keep the typed values and re-enable submission. If the edit receives `404` `PRODUCT_NOT_FOUND` (the product was removed), it SHALL show an error toast and go back to the dashboard.

#### Scenario: Duplicate SKU
- **WHEN** the API responds `409` `SKU_CONFLICT` when saving
- **THEN** the SKU field shows that the SKU already exists, the other values remain, focus is on the SKU and the button becomes enabled again

#### Scenario: Server validation
- **WHEN** the API responds `400` with `details` pointing to `price`
- **THEN** the message appears on the price field

#### Scenario: Network failure
- **WHEN** submission fails due to a network error or `5xx`
- **THEN** a generic error toast appears, the values remain and the user can submit again

#### Scenario: Product removed during editing
- **WHEN** the API responds `404` `PRODUCT_NOT_FOUND` when saving
- **THEN** an error toast appears and the SPA goes back to the dashboard

### Requirement: Cancel
The form SHALL have the "Cancel" action, which goes back to the dashboard (create) or to the product's detail page (edit) without sending anything.

#### Scenario: Cancel creation
- **WHEN** the user activates "Cancel" at `/products/new`
- **THEN** the SPA opens `/` and no write request is made

#### Scenario: Cancel editing
- **WHEN** the user activates "Cancel" at `/products/1/edit`
- **THEN** the SPA opens `/products/1` and no write request is made

### Requirement: Responsive form layout
The form SHALL use one column below 640 px and two columns from 640 px (title and description take the full width), with controls at least 44 px tall and no horizontal scrolling at 360, 768 and 1280 px.

#### Scenario: Mobile and desktop
- **WHEN** the width is 360 px and then 1280 px
- **THEN** the fields appear in one column and in two columns, respectively, with no horizontal scrolling
