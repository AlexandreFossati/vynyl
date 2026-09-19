# Spec Delta

## MODIFIED Requirements

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
