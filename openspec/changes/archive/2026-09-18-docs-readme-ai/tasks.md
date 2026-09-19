# Tasks

> References: `specs/project-documentation`; decisions in `design.md` (D1–D5); guide, section 14; `DELIVERABLES.md`. Language: `README.md` and `AI.md` in **English**; these artifacts in Portuguese. **No new code**, no dependencies, no translating the planning documents. Every technical fact in the README comes from the code, from `.env.example`, from the specs or from an executed command. No e2e/Cypress (user decision).

## 1. Documents

- [x] 1.1 Write `README.md` (D2, D3). Verify by checking each technical claim against the source (variables against `.env.example` and `env.ts`, routes and codes against the specs and the code, scripts against `package.json`) and by running the commands it says to run.
- [x] 1.2 Rewrite `AI.md` as the final narrative (D4). Verify by rereading against the commit history and the specs: nothing claimed that did not happen, and the limits section present.

## 2. Verification and closing

- [x] 2.1 Clean clone (D5): clone to a short path, copy README/AI.md/uncommitted artifacts, follow the README literally (`npm install`, `npm start` with a temporary database, `curl` of the page, the routes and the API), then `npm run lint`, `npm run typecheck` and `npm test`; check the clone's `git status` (lockfile) and delete the clone. State what was not verifiable.
- [ ] 2.2 Check `DELIVERABLES.md` item by item against the repository, check what is met and leave open, with the reason, what depends on the user (GitHub link, session record, API optionals, GitHub Actions). Check T7 in the "Overall status" of `OPENSPEC_TASKS.md` (the user checked it in the browser) and reflect T8. Idempotent `npm run format`, `openspec validate docs-readme-ai --strict`, final report with what was **not** verified.
