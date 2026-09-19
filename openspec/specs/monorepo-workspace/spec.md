# monorepo-workspace Specification

## Purpose

Defines the repository structure and the quality checks that any developer runs from the root, ensuring the project is installable, verifiable and portable across operating systems from the first commit.

## Requirements

### Requirement: Workspace with three packages
The repository SHALL be a monorepo with exactly three workspace packages: `apps/api`, `apps/web` and `packages/shared`. A single `npm install` at the root SHALL install the dependencies of all packages and generate a single versioned `package-lock.json`.

#### Scenario: Installation from a clean clone
- **WHEN** a developer clones the repository and runs `npm install` at the root, with the pinned runtime
- **THEN** installation completes without errors, including dependencies with native components, and no additional manual step is needed

#### Scenario: Packages recognized by the workspace
- **WHEN** the developer lists the npm workspaces
- **THEN** `apps/api`, `apps/web` and `packages/shared` appear, and the `api` and `web` packages declare a dependency on `shared`

### Requirement: Pinned runtime version
The repository SHALL declare the supported runtime version through `.nvmrc` and the `engines` field of the root `package.json`. The declared version SHALL be a Node.js LTS line compatible with all installed dependencies.

#### Scenario: Version declared consistently
- **WHEN** the developer compares `.nvmrc` with the `engines` field
- **THEN** the `.nvmrc` version satisfies the range declared in `engines`

### Requirement: Cross-platform root scripts
The root SHALL expose the scripts `lint`, `typecheck`, `test`, `format`, `build`, `dev` and `start`. No script SHALL depend on syntax exclusive to a specific shell, so that they work on Windows, Linux and macOS.

#### Scenario: Static checks pass on a clean tree
- **WHEN** the developer runs `npm run lint` and `npm run typecheck` at the root of an unmodified tree
- **THEN** both finish with exit code 0

#### Scenario: Tests with no cases yet
- **WHEN** the developer runs `npm test` at the root and no package has tests
- **THEN** the command finishes with exit code 0, without failing for lack of tests

#### Scenario: Build of all packages
- **WHEN** the developer runs `npm run build` at the root
- **THEN** the API and the SPA are built successfully and no build artifact is versioned

#### Scenario: Development mode
- **WHEN** the developer runs `npm run dev` at the root
- **THEN** the API and SPA development processes start together, and the SPA is reachable at a local address shown in the terminal

#### Scenario: One-command start
- **WHEN** the developer runs `npm start` at the root of a clone with dependencies installed and no previous build
- **THEN** the API and the SPA are built, the server comes up at `http://localhost:3000` (or at the configured `PORT`) serving the API and the SPA, and the log indicates it is listening

#### Scenario: Start fails if the build fails
- **WHEN** the build of some package fails during `npm start`
- **THEN** the server is not started and the command finishes with a non-zero exit code

### Requirement: Strict type checking
Type checking SHALL operate in strict mode in all packages. Code with a type error, including use of an undefined implicit type, SHALL make `npm run typecheck` fail.

#### Scenario: Type error is detected
- **WHEN** a TypeScript file in any package contains a type error
- **THEN** `npm run typecheck` finishes with a non-zero exit code pointing to the file and line

### Requirement: Folder skeleton with no application logic
The repository SHALL contain the folder structure defined in section 3 of `PROJECT_GUIDE.md`: the API layer folders (`config`, `routes`, `handlers`, `services`, `repositories`, `mappers`, `db`, `middleware`, `lib`), the SPA's Atomic Design folders (`atoms`, `molecules`, `organisms`, `templates`, `pages`), plus `lib/api` and `styles`. Folders that still have no content SHALL be versioned by means of marker files. No placeholder file SHALL contain application logic.

#### Scenario: Structure present after the clone
- **WHEN** the developer clones the repository
- **THEN** all the layer folders and Atomic Design level folders exist, even the empty ones

### Requirement: SPA placeholder page
The SPA SHALL display a minimal page containing only the application's title, proving that the frontend development environment and build work.

#### Scenario: Page served in development
- **WHEN** the SPA's development server is running and the developer opens the local address in the browser
- **THEN** the page loads and displays the application's title, with no console errors

### Requirement: Test runners configured
The `api`, `web` and `shared` packages SHALL have the unit test runner configured, and the `web` package SHALL have the component test environment prepared. The end-to-end test runner SHALL be configured in the `web` package with no test file.

#### Scenario: Frontend unit runner in a simulated browser environment
- **WHEN** a component test is added to the `web` package and `npm test` is run
- **THEN** the test runs in an environment with a DOM and can render SPA components

### Requirement: Ignored files and environment template
The repository SHALL ignore in version control installed dependencies, build artifacts, real environment files (`.env`), local databases (`data/*.db` and their auxiliary files) and end-to-end test run artifacts. The `data/products.json` file SHALL remain versioned. A `.env.example` SHALL be versioned listing the supported environment variables, with example values and no secrets.

#### Scenario: Secrets and artifacts outside version control
- **WHEN** the developer creates a `.env`, a `data/app.db` database and runs the build
- **THEN** `git status` does not list those files as untracked

#### Scenario: Data set remains versioned
- **WHEN** the developer runs `git status` after creating or editing `data/products.json`
- **THEN** the file appears as trackable, not as ignored
