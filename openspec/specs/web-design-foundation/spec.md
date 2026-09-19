# web-design-foundation Specification

## Purpose

Give the SPA a clean, simple and responsive visual foundation, with a single source of design values, so that all screens are consistent and cheap to maintain.

## Requirements

### Requirement: Design tokens as the single source
`styles/tokens.css` SHALL define, as CSS variables, the palette (neutrals, one accent color and the semantic colors of success, warning and danger), the spacing scale (4, 8, 12, 16, 24, 32 and 48 px), the typographic scale, the radii and the shadows. Components SHALL use these tokens and SHALL NOT declare literal colors or spacing values outside the scale.

#### Scenario: Components without literal colors
- **WHEN** the components' styles are inspected
- **THEN** no color is declared by a literal value (`#...`, `rgb(...)`, `hsl(...)`); all come from `var(--...)`

### Requirement: Base styles and system font
`styles/base.css` SHALL apply a light reset, the system font (no external fonts), `box-sizing: border-box` and the typographic scale, and SHALL be loaded once at the application entry together with the tokens.

#### Scenario: No external font dependencies
- **WHEN** the page is loaded
- **THEN** no request to external fonts or stylesheets is made

### Requirement: Mobile-first with two breakpoints
The base CSS SHALL be written for small screens, and adaptations SHALL use `min-width` at the 640 px and 1024 px breakpoints.

#### Scenario: Layout by width
- **WHEN** the window width is less than 640 px, between 640 and 1023 px, or 1024 px or more
- **THEN** the layout uses, respectively, the mobile, the intermediate and the desktop variation

### Requirement: Visible focus and touch targets
Every interactive element SHALL show a visible focus indicator when focused by keyboard, and SHALL have a minimum height of 44 px.

#### Scenario: Keyboard navigation
- **WHEN** the user goes through the page with the Tab key
- **THEN** each focused control displays a visible outline with sufficient contrast

#### Scenario: Touch target
- **WHEN** a button or field is rendered
- **THEN** its height is at least 44 px

### Requirement: Adequate contrast
The text and background color pairs used by the components SHALL have a minimum contrast ratio of 4.5:1 (normal text), and the focus outline 3:1 against the background.

#### Scenario: Token pairs
- **WHEN** the contrast ratio of each text/background pair declared in `tokens.css` is calculated
- **THEN** all meet the minimum above

### Requirement: No horizontal scrolling
No screen SHALL produce horizontal page scrolling at widths of 360, 768 and 1280 px.

#### Scenario: Reference widths
- **WHEN** the dashboard is displayed at 360, 768 and 1280 px of width
- **THEN** the document's scroll width does not exceed the window width
