# Design

## Context

Documentation only. Sources: `PROJECT_GUIDE.md` (decisions, section 14 says what the README and AI.md must contain), `DELIVERABLES.md` (the PDF checklist), the specs in `openspec/specs` (actual behavior) and the code. The planning documents remain in Portuguese for now; the user translates them in a final commit. The deliverables (`README.md`, `AI.md`) are in English.

## Goals / Non-Goals

**Goals:** a README that leads to the running app and communicates decisions, assumptions, open questions, the extra feature and cuts; AI.md as a narrative; everything checked against the code.
**Non-Goals:** new code, translating planning documents, recording/exporting the session record, creating the GitHub repository.

## Decisions

### D1. Every technical fact in the README comes from a checkable source
Versions, ports, environment variables, routes, error codes, limits and behaviors are copied from the code, from `.env.example`, from the specs or from an executed command, and not from memory. Numbers that change with every commit (number of tests) do **not** go in the README.

### D2. README structure (in this order)
1. Overview. 2. How to run (prerequisites, `npm install`, `npm start`, address, resetting the database). 3. Development and tests (`npm run dev`, scripts table, what the tests cover). 4. Repository structure. 5. API (routes, pagination, search, error format). 6. Product decisions. 7. Assumptions. 8. Open questions. 9. Extra feature: resilience and scale (problem, who, why, the measured limitation). 10. Quality and security (what was done). 11. What was left out and next steps. 12. Known installation problems. 13. How it was made (AI.md and planning documents). The README stays short enough to read in a few minutes: fine details stay in the specs.

### D3. Cuts stated with a reason and a next step
Each item not done appears with the reason and what would be done: e2e/Cypress (little time; the `cypress` directory and the dependency exist, with no specs), API optionals (sorting and categories), GitHub Actions (list of the jobs that would exist), `helmet`/restricted CORS, authentication, `NODE_ENV=production` in `npm start`, a network database so singleflight has a real effect.

### D4. AI.md as a narrative, without duplicating the history
Rewritten from the current log: workflow in phases, what worked well and badly (keeping the T1/T2 items), one note per task (T3–T7) and a "Not verified" section with the limits (one browser, no screen reader, no e2e). No technical details that the code, the specs and the commits already record.

### D5. Verification
On a clean clone (short path, because of the Windows path limit mentioned in T1), follow the README **literally**: `npm install` (not `npm ci`, which is what the README says), `npm start`, open the page via `curl`, and then `npm run lint`, `npm run typecheck` and `npm test`. Since the clone comes from `HEAD`, the not-yet-committed README and AI.md are copied into it; no code changes. `DELIVERABLES.md` is checked item by item and the items that only the user can fulfill (GitHub link, session record) stay open and are stated as such.

## Risks / Trade-offs

- **README going out of date** if the code changes → it describes stable contracts and points to the specs for the detail.
- **`npm install` in the clone may change the lockfile** → check `git status` in the clone afterwards; if it changes, that is a finding to report.
- **The rendering in the browser** was already checked by the user in T7; the README promises no more than that.

## Migration Plan

No migration. Rollback: revert the commit.

## Open Questions

None.
