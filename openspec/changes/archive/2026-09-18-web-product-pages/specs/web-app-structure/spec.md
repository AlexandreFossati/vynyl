# Spec Delta

## MODIFIED Requirements

### Requirement: Minimal routing
The SPA SHALL choose the page by the URL path using the History API: `/` shows the dashboard, `/products/new` the creation, `/products/:id` the detail and `/products/:id/edit` the edit, where `:id` is a positive decimal integer (digits only, no leading zeros). Any other path, including an invalid `:id`, shows the not-found page, with a link back to `/`. Internal navigation SHALL happen without reloading the page and SHALL respond to the browser's back and forward buttons.

#### Scenario: Known route
- **WHEN** the user opens `/`
- **THEN** the dashboard is displayed

#### Scenario: Product routes
- **WHEN** the user opens `/products/new`, `/products/7` and `/products/7/edit`
- **THEN** the creation, the detail and the edit of product 7 are displayed, respectively

#### Scenario: Unknown route
- **WHEN** the user opens `/does-not-exist`
- **THEN** the not-found page is displayed with a link to `/`

#### Scenario: Invalid identifier
- **WHEN** the user opens `/products/abc`, `/products/0`, `/products/-1`, `/products/1.5` or `/products/007`
- **THEN** the not-found page is displayed and no request to the API is made

#### Scenario: Navigation without reloading
- **WHEN** the user activates the "Back to products" link on the not-found page
- **THEN** the dashboard appears, the URL becomes `/` and the page is not reloaded

#### Scenario: Browser back
- **WHEN** the user goes back in the browser history
- **THEN** the page corresponding to the previous path is displayed

## ADDED Requirements

### Requirement: Internal links
Links between screens SHALL be real anchors (`<a href>`), so that they work with the keyboard and with "open in new tab". A plain click (primary button, without Ctrl, Cmd, Shift or Alt) SHALL navigate without reloading the page; other clicks SHALL keep the browser's behavior. The header brand SHALL be a link to `/`.

#### Scenario: Plain click
- **WHEN** the user clicks an internal link
- **THEN** the SPA navigates to the destination without reloading the page

#### Scenario: Click with Ctrl
- **WHEN** the user clicks an internal link with Ctrl pressed
- **THEN** the SPA does not intercept the click (the browser opens the destination in another tab)

#### Scenario: Header brand
- **WHEN** the user activates the brand in the header
- **THEN** the SPA opens `/`
