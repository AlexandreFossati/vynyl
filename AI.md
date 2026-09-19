# AI.md

How AI coding tools were used on this project, told from the point of view of the collaboration between the developer and the AI. Technical problems and their fixes live in the code, the specs (`openspec/`) and the commit history, not here.

## Summary

- **Tools:** Claude Code (agentic coding, used for planning and implementation) and OpenSpec (spec-driven changes).
- **Shape of the work:** a planning phase with no code, then eight tasks (T1 to T8), each one an OpenSpec change with a proposal, specs, design and tasks written before any code. T9 (optional endpoints) was dropped.
- **Division of labor:** the AI proposed options and did the work; the developer made every product and technical decision, reviewed the model tasks, ran the app, and owned the closing checkboxes.
- **Where it went wrong** and how it was caught is in [What worked less well](#what-worked-less-well) and in the notes of each task.
- **Where to look for evidence:** `git log` (each task is an implementation commit followed by an archive commit), `openspec/changes/archive/` (the change of every task) and `OPENSPEC_TASKS.md` (the roadmap with what was verified).

## Workflow

### Discovery and planning (before OpenSpec)

No code was written in this phase. The agent acted as a senior engineer and the outcome was a set of markdown files that every later session reuses.

1. **Requirements:** the agent extracted every deliverable from `requirements.pdf` into `DELIVERABLES.md`. Ground rules set by the developer: stay strictly inside the requested scope, but make that scope production ready.
2. **Decision Q&A:** several rounds of structured questions, each with a recommended option and its trade-offs, covered stack, data access, validation, repo layout, tests, API behavior, the extra feature, security and operations, and how to run the project. The developer made the calls, for example Express instead of Hono, Svelte, SQLite and a single `npm start`.
3. **Agent pushback:** the agent raised risks and the developer decided. A synchronous SQLite driver would make the planned singleflight ineffective, so the limitation was accepted and documented. GitHub Actions and `helmet` had been left out despite the PDF and the security goal, and the developer confirmed that.
4. **Refinements:** a layered API (routes, handlers, services, repositories), Atomic Design for the frontend and a clean, responsive UI as a frontend prerequisite. The extra feature is resilience: a REST client with retry and exponential backoff, plus a backend singleflight.
5. **Explored and dropped:** Docker (to remove cross-platform doubts) was considered and dropped for time. Vite for the API bundle worked in a test, but `tsup` was kept as the more conventional choice.
6. **Artifacts:** `PROJECT_GUIDE.md` (decisions), `OPENSPEC_TASKS.md` (roadmap with checkboxes, task by task) and `CLAUDE.md` (senior-engineer agent profile, rules and Definition of Done, loaded automatically each session). Language rule: deliverables in English, planning documents in Portuguese until a final translation by the developer.

### Implementation (OpenSpec)

- **One OpenSpec change per task:** proposal, specs, design and tasks are written first, then implemented, verified by running things (not by assumption), committed and archived, with a short note added here.
- **Model tasks:** T2 (API) and T5 (frontend) are the reference slices. The developer reviewed them and approved the patterns before they were replicated in T3 and T6.
- **Checkboxes as a contract:** the agent ticks a scope or acceptance item only when it was actually run and observed; the task itself is ticked after the developer reviews.
- **Scope changes are recorded, not silently applied:** when the developer dropped the e2e tests and T9, the roadmap items were struck through with the reason instead of being ticked or deleted.

## What worked well

- **Decisions stayed human, options came from the AI.** Structured questions with a recommended option and its trade-offs let the developer decide quickly. The recommendation was often followed and overridden whenever the developer had a reason: Express instead of Hono, no Docker, keeping a component the AI had advised against.
- **Files, not chat, as shared memory.** The decision guide, the roadmap with checkboxes and `CLAUDE.md` (agent profile, rules and Definition of Done) gave every session the same starting point, including after the context was cleared. The checkboxes tell the agent what is done and what comes next.
- **Hard gates between phases.** Planning artifacts before code, `propose` separate from `apply`, and a human review at the model tasks.
- **Scope discipline was written down, so it held.** "Only what the assignment asks, production ready" plus the agent profile prevented feature creep. The agent even removed a requirement that had survived from a feature the developer had already dropped.
- **Review checkpoints on the model tasks.** The developer read the first API slice, ran the production bundle personally and approved the patterns before they were replicated. The same happened with the frontend.
- **Verification by running the real thing.** Real server calls, a real browser and a clean clone found problems that unit tests could not (see the notes on T5, T6 and T7).
- **Small, separate commits** (implementation apart from archive) kept each diff easy to review.

## What worked less well

- **Verbosity.** Long reports and option lists early on; the developer asked for concise output.
- **Silent stretches.** Long autonomous runs sometimes went without a progress update.
- **Confident claims that needed checking.** In one case the AI presented an assumption as fact (that an asynchronous driver would let the singleflight coalesce). It changed only after being measured, and the developer had to confirm the decision again with the corrected information.
- **Suggestions ahead of priorities.** The AI offered extra hardening and process ideas before the developer had set the priorities. Several were declined (CI, more security headers, Docker) to protect the time budget.
- **Mistakes in its own verification.** The AI's checks were wrong more than once (see T5 and T6), and reading each failure to tell a defect of the app from a defect of the check was part of the job.
- **A tool permission stopped an action.** The commit of one task was denied by the tool's permission check; the agent handed over instead of working around it, and the developer allowed it afterwards.

## Notes per task

- **T1 and T2 (scaffold, model API slice):** the planning artifacts made the first sessions fast, and the developer's review of the first endpoint fixed the patterns (file naming, dependency injection, validation, error handling, logging, test style) that every later API task copied.
- **T3 (remaining endpoints):** once the API patterns were approved on the model task, the developer delegated the whole flow for the next tasks (propose, apply, verify, commit, archive) and kept one deliberate stop: before committing the frontend model task. The agent replicated the approved patterns without inventing new ones, and asked no questions because every open point could be settled by the guide, the roadmap or a measurement.
- **T4 (operability and scale):** the planning stage measured the library behaviors it depended on (rate limit headers, `Retry-After`, how `server.close()` treats hung requests) before any design was written, so the implementation had no surprises. The singleflight limitation was stated in the spec, in the code and in the commit rather than left for the README to discover: with a local SQLite file it coalesces almost nothing, and the agent was told not to claim otherwise. What cannot be tested on this machine was declared, not glossed over: Windows does not deliver real SIGINT/SIGTERM to a child process, so the shutdown was verified in the real process by emitting the signal event, and delivery by the OS remains unverified.
- **T5 (frontend model task):** the second deliberate stop: the agent implemented and verified everything, then handed over an uncommitted diff with a report of what was and was not verified, and the developer reviewed the code and ran the app before approving. The layout claims were checked in a real browser at 360, 768 and 1280 px, and that check caught a mistake in the agent's own verification: the first run compared the page width against Cypress's default viewport (1000 px) instead of the real one, so the narrow layouts passed vacuously. Only after it was fixed and rerun did the result count.
- **T6 (product pages):** the agent read every T5 component and test before designing, so the new screens reused the approved patterns (pages receive the API as a prop, one file per component, tokens only) and the only new abstractions were the ones the screens forced: a link atom, a form, a dialog and toasts. The unit tests were green early, and the real-browser run against the real API is what found the bugs that jsdom cannot show: a browser closes a modal dialog on Esc by itself when the page has had no user interaction, which left the parent out of step so the dialog could not be reopened (the agent proved it by removing the fix and watching the test fail); the desktop dialog stretched to full height; the description field rendered in a monospace font. Some failures of the throwaway browser spec were the spec's own mistakes (a Cypress API removed in v16, a `String.replace` replacement pattern). The developer then clicked through the running app before approving the commit.
- **T7 (serving the SPA and `npm start`):** the developer cut the scope up front: no e2e tests and no Cypress. The agent took that literally, so the change is only the static serving, the client-route fallback and one root script, the Cypress items in the roadmap were struck through with the reason instead of ticked, and the browser-driven checks of earlier tasks were not reused. Without a browser test, the risk was moved to what a browser would have exercised: the routing rules (client route versus missing file versus unknown API path) are covered by request-level tests, including a hand-written raw request for the `..` case because the test HTTP client normalizes it, and the real server was probed from a clean clone (`npm ci`, `npm start`, `curl`), which also showed that this npm blocks dependency install scripts by default and that the app does not need them. The developer opened the production build in a browser and approved it.
- **T8 (README and this file):** the agent wrote the README with a rule that every technical claim comes from a source it can check (the code, `.env.example`, a spec or a command that was run), left volatile numbers such as the test count out, and listed each cut with its reason and next step instead of hiding it. The check was to follow the README literally in a clean clone, and it found a real problem that no test could: `npm install` rewrote `package-lock.json`, because the committed lockfile carried 190 lines of stale "extraneous" entries, so every fresh install would have left the repository dirty. The pruned lockfile was committed on its own. Two things stay with the developer because the agent cannot do them: publishing the repository and attaching the record of the coding session.

## What was not verified

- **End-to-end tests do not exist.** The developer decided to drop them for time. Browser checks were manual, or done with throwaway scripts that are not in the repository.
- **One browser only** (Electron, through Cypress), plus whatever browser the developer used by hand. No real screen reader was used; labelling, focus and live regions follow standard practice and were checked programmatically.
- **The OS does not deliver signals to the shutdown test on Windows:** the graceful shutdown was verified by emitting the signal event in the real process, not by a real Ctrl+C or `SIGTERM`.
- **The singleflight has no measurable effect with a local SQLite file.** This is a known, documented limitation and not a bug.
- **The optional endpoints, GitHub Actions, `helmet` and authentication were not done.** See the README.

## Practices worth keeping

- Ask the AI for evidence (run it, measure it) before accepting a claim, and make it say what it did not verify.
- Put every decision in a file the agent reloads, and update the file when the decision changes.
- Keep approvals explicit and per phase, and let the human own the closing checkboxes.
- Move the risk to where it can still be checked when a whole kind of test is cut.
- Time-box: cut ideas early when the budget is short.
- Ask for brevity from the start.
