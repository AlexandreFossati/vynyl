# Proposal

## Why

The code is ready (T1–T7), but the statement evaluates **communication** as much as the code: a `README.md` that takes an evaluator from a clone to a working page, with assumptions, product decisions, open questions, the extra feature and what was left out, and an `AI.md` with the honest narrative of the work with AI. Today the `README.md` has only the title and `AI.md` is a running log. T8 writes the two final documents and checks the result by following the README itself on a clean clone.

## What Changes

- **`README.md`** (English) per section 14 of the guide: overview, requirements (Node), how to run and test (`npm install`, `npm start`, URL), scripts, structure, summary of the API and the error format, **product decisions**, **assumptions**, **open questions**, **extra feature** (problem, who uses it, why, and the singleflight limitation with local SQLite), how quality was handled, **what was left out and next steps** (e2e/Cypress, API optionals, GitHub Actions, helmet/CORS, authentication, etc.) and known installation problems.
- **`AI.md`** (English) rewritten as a final narrative, from the current log: workflow (planning → OpenSpec → tasks with checkpoints), tools, what worked well and badly, notes per task, and what was not verified.
- **Verification on a clean clone**: `git clone` to a short path, follow the README step by step (`npm install`, `npm start`), check the application and run `lint`, `typecheck` and `test`; check `DELIVERABLES.md` item by item.

**Out of scope**: new code (except a fix for something the verification reveals), translating the planning documents (the user does that in a commit of their own at the end), the record of the coding session (video or trace) and the GitHub link, which are deliverables of the user.

## Capabilities

### New Capabilities

- `project-documentation`: what the final `README.md` and `AI.md` must contain and the rule that the README's instructions work on a clean clone.

### Modified Capabilities

None.

## Impact

- **Files**: `README.md`, `AI.md`, `DELIVERABLES.md` (checking the items) and `OPENSPEC_TASKS.md`. No application code.
- **Risks**: the README claiming something the code does not do. Mitigation: each technical claim in the README is checked in the code, in the specs or by running the command; and what was not verified is said as such.
