# project-documentation Specification

## Purpose
Ensure that whoever receives the repository can run it, understand the decisions and limitations and see how the work was done with AI, just by reading `README.md` and `AI.md`.

## Requirements

### Requirement: README that leads to a working page
`README.md` SHALL be in English and SHALL teach, with no hidden steps, how to get from a clean clone to a working page: the required Node version, `npm install`, `npm start` and the address `http://localhost:3000`, as well as how to run the tests, the development mode and how to reset the database. The instructions SHALL work on Windows, Linux and macOS.

#### Scenario: Following the README on a clean clone
- **WHEN** someone clones the repository and runs only the README's commands, in order
- **THEN** the API and the SPA come up at `http://localhost:3000` and the README's tests, lint and typecheck pass

### Requirement: Content required by the statement
`README.md` SHALL contain distinct sections for: overview; how to run and test; repository structure; the API (routes and error format); **product decisions**; **assumptions**; **open questions**; the **extra feature** (the problem it solves, who would use it, why it was chosen and the limitation of singleflight with local SQLite); and **what was left out and the next steps**.

#### Scenario: DELIVERABLES items covered
- **WHEN** `DELIVERABLES.md` is checked item by item against `README.md` and `AI.md`
- **THEN** each item of the README and of AI.md appears as met, or explicitly justified as not done

### Requirement: Honesty about what was not done or verified
`README.md` SHALL list as not done the e2e tests (Cypress), the optional endpoints (sorting and categories), GitHub Actions, `helmet`/restricted CORS and authentication, and SHALL say that singleflight does not coalesce queries with local SQLite. No claim in the README SHALL describe a behavior that the code does not have.

#### Scenario: Scope cuts
- **WHEN** the reader looks for what was not implemented
- **THEN** they find each item above, with the reason and what would be done next

### Requirement: AI.md with narrative and assessment
`AI.md` SHALL be in English and SHALL contain the narrative of the AI-assisted coding workflow (planning, OpenSpec, tasks with review checkpoints), the tools used, what worked well, what worked badly or required correction and what was not verified, without repeating the technical details that are already in the code, the specs and the commit history.

#### Scenario: Reading AI.md
- **WHEN** an evaluator reads `AI.md`
- **THEN** they understand how decisions were made, where the AI got it wrong or needed correction and how that was detected
