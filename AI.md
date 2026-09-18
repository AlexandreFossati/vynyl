# AI.md

Running log of how AI tooling was used on this project. It is appended to after each task and turned into the final narrative in T8.

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

## T1 - scaffold-monorepo

**What went well**
- Checking peer dependencies before installing caught that TypeScript 7 (`latest`) is not accepted by `typescript-eslint` or `svelte-check`, and that `jsdom` needs a stricter Node range than first assumed.
- Verification ran real commands instead of assuming: a clean-copy `npm ci` with empty caches, the SPA in a real browser through Cypress, 28 checks against the migration and 27 against the dataset.

**What went poorly**
- `better-sqlite3` v13 installed fine from scratch but failed with `node-gyp` when installing from the lockfile. The early research only tested installs without a lockfile. Switched to `@libsql/client`.
- The agent claimed an async driver would make the singleflight effective. A measurement showed it does not with local SQLite (5 requests, 5 executions). Corrected in the guide.
- Smaller misses, all caught by verification: wrong `engines` range, missing `allowJs` for `svelte-check`, and a Windows long-path failure that only appeared in the clean-clone simulation.

**Lessons**
- Test installs from the lockfile, not just fresh installs.
- Measure a claim before letting it drive a decision.
- Keep verification scripts throwaway and outside the repository.
