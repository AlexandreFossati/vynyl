# AI.md

Running log of how AI tooling is used on this project, focused on the collaboration between the developer and the AI. It is appended to as the work goes on and turned into the final narrative in T8. Technical problems and their fixes live in the code, the specs and the commit history, not here.

## Workflow

**Tools:** Claude Code (agentic coding) and OpenSpec (spec-driven changes).

### Discovery and planning (before OpenSpec)

No code was written in this phase. The agent acted as a senior engineer and the outcome was a set of markdown files that later sessions reuse.

1. **Requirements:** the agent extracted every deliverable from `requirements.pdf` into `DELIVERABLES.md`. Ground rules set by the developer: stay strictly inside the requested scope, but make that scope production ready.
2. **Decision Q&A:** several rounds of structured questions, each with a recommended option and trade-offs, covered stack, data access, validation, repo layout, tests, API behavior, the extra feature, security and operations, and how to run the project. The developer made the calls, for example Express instead of Hono, Svelte, SQLite and a single `npm start`.
3. **Agent pushback:** the agent raised risks and the developer decided. A synchronous SQLite driver would make the planned singleflight ineffective, so the limitation was accepted and documented. GitHub Actions and `helmet` had been left out despite the PDF and the security goal, and the developer confirmed that.
4. **Refinements:** a layered API (routes, handlers, services, repositories), Atomic Design for the frontend and a clean, responsive UI as a frontend prerequisite. The extra feature is resilience: a REST client with retry and exponential backoff, plus a backend singleflight.
5. **Explored and dropped:** Docker (to remove cross-platform doubts) was considered and dropped for time. Vite for the API bundle worked in a test, but `tsup` was kept as the more conventional choice.
6. **Artifacts:** `PROJECT_GUIDE.md` (decisions), `OPENSPEC_TASKS.md` (roadmap with checkboxes, task by task) and `CLAUDE.md` (senior-engineer agent profile, rules and Definition of Done, loaded automatically each session). Language rule: deliverables in English, planning documents translated at the end.

### Implementation (OpenSpec)

- **One OpenSpec change per task:** proposal, specs, design and tasks are written first, then implemented. Each task ends with a human review and a commit; the agent commits only when asked.
- **Model tasks:** T2 (API) and T5 (frontend) are reviewed before their patterns are replicated.

## Learnings from the collaboration (T1 and T2)

**What worked well**
- **Decisions stayed human, options came from the AI.** Structured questions with a recommended option and its trade-offs let the developer decide quickly. The recommendation was often followed and overridden whenever the developer had a reason: Express instead of Hono, no Docker, keeping a component the AI had advised against.
- **Files, not chat, as shared memory.** The decision guide, the roadmap with checkboxes and `CLAUDE.md` (agent profile, rules and Definition of Done) give every session the same starting point. The checkboxes tell the agent what is done and what comes next.
- **Hard gates between phases.** Planning artifacts before code, `propose` separate from `apply`, no commits by the agent unless asked, and every diff reviewed by the developer.
- **Scope discipline was written down, so it held.** "Only what the assignment asks, production ready" plus the agent profile prevented feature creep. The agent even removed a requirement that had survived from a feature the developer had already dropped.
- **Review checkpoints on the model tasks.** The developer read the first API slice, ran the production bundle personally and approved the patterns before they were replicated.
- **Small, separate commits** (implementation apart from archive) kept each diff easy to review.

**What worked less well**
- **Verbosity.** Long reports and option lists; the developer asked for concise output.
- **Silent stretches.** Long autonomous runs sometimes went without a progress update.
- **Confident claims that needed checking.** In one case the AI presented an assumption as fact. It changed only after being measured, and the developer had to confirm the decision again with the corrected information.
- **Suggestions ahead of priorities.** The AI offered extra hardening and process ideas before the developer had set the priorities. Several were declined (CI, more security headers, Docker) to protect the time budget.

**Practices worth keeping**
- Ask the AI for evidence (run it, measure it) before accepting a claim, and to say what it did not verify.
- Put every decision in a file the agent reloads, and update the file when the decision changes.
- Keep approvals explicit and per phase, and let the human own the closing checkboxes.
- Time-box: cut ideas early when the budget is short.
- Ask for brevity from the start.

## Delegation after the model task (T3 onward)

- **T3 (remaining endpoints):** once the API patterns were approved on the model task, the developer delegated the whole flow for the next tasks (propose, apply, verify, commit, archive) and kept one deliberate stop: before committing the frontend model task. The agent replicated the approved patterns without inventing new ones, and asked no questions because every open point could be settled by the guide, the roadmap or a measurement.
- **T4 (operability and scale):** the planning stage measured the library behaviors it depended on (rate limit headers, `Retry-After`, how `server.close()` treats hung requests) before any design was written, so the implementation had no surprises. The singleflight limitation was stated in the spec, in the code and in the commit rather than left for the README to discover: with a local SQLite file it coalesces almost nothing, and the agent was told not to claim otherwise. What cannot be tested on this machine was declared, not glossed over: Windows does not deliver real SIGINT/SIGTERM to a child process, so the shutdown was verified in the real process by emitting the signal event, and delivery by the OS remains unverified.
- **T5 (frontend model task):** this was the second deliberate stop: the agent implemented and verified everything, then handed over an uncommitted diff with a report of what was and was not verified, and the developer reviewed the code and ran the app before approving. The layout claims were checked in a real browser at 360, 768 and 1280 px, and that check caught a mistake in the agent's own verification: the first run compared the page width against Cypress's default viewport (1000 px) instead of the real one, so the narrow layouts passed vacuously. Only after it was fixed and rerun did the result count. What still is not verified is stated plainly: one browser only (Electron), and keyboard focus was exercised programmatically, not with a real Tab key.
