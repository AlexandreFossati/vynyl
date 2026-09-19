# Deliverables — Vynyl Test (Fullstack)

Extracted from `requirements.pdf`. Suggested time: **60–90 min** (not timed; if something is left incomplete, explain what would be done next).

## 1. Final deliverables

- [ ] **Link to a GitHub repository** containing: — up to the user (publish the repository)
  - [x] Final code (SPA + API)
  - [x] `README.md`
  - [x] `AI.md`
- [ ] **Record of the coding session**, one of the two: — up to the user
  - [ ] Screen-capture video of the coding session, **or** — up to the user
  - [ ] Full trace of the prompts and interactions with agents — up to the user

## 2. `README.md`

Must explain:

- [x] How to bring up and run the solution (the evaluator will clone the repo and follow the instructions until reaching a working web page)
- [x] Assumptions
- [x] Open questions
- [x] Other information that helps understand the candidate as a developer
- [x] **Product decisions** made to clarify or extend the specification
- [x] What would be done next, if any part is left incomplete
- [x] **Extra feature** (see section 7): the problem it solves, who would use it, why it was chosen

## 3. `AI.md`

- [x] Narrative view of the workflow with AI-assisted coding
- [x] Notes on what worked well and what worked badly during the project

Note: using agentic coding tools of the candidate's choice is mandatory.

## 4. General requirements

- [x] Build a **SPA** and an **API**
- [x] Must run locally. Accepted options: Docker + relational database, `npm start` + SQLite, local JSON serialization, or something in between
- [x] Treat it as a project that will be used to onboard other developers
- [x] No templates provided (free choices)
- [x] Suggested stack (not mandatory; if diverging, justify):

| Stack | Frontend | Router/API | ORM |
|---|---|---|---|
| TypeScript | Svelte, React, etc. | Hono (optional) | Preferred, or none |
| Python | Preferred | FastAPI (justify if using another) | SQLAlchemy, or none |
| Laravel | Defaults | Defaults | Defaults |

## 5. Data (data set)

Create a data set following the template below (the PDF shows 2 example items and `{...}` for the rest):

```json
[
  {
    "id": 1,
    "title": "Large Flux Capacitor",
    "description": "The Large Flux Capacitor provides the maximum motive force for your inter-dimensional aluminum automobile.",
    "category": "automotive",
    "price": 9.99,
    "stock": 42,
    "brand": "ACME",
    "sku": "ACM-FC-001",
    "weight": 4,
    "meta": {
      "createdAt": "2025-04-30T09:41:02.053Z",
      "updatedAt": "2025-04-30T09:41:02.053Z"
    }
  }
]
```

Fields: `id`, `title`, `description`, `category`, `price`, `stock`, `brand`, `sku`, `weight`, `meta.createdAt`, `meta.updatedAt`.

Note: the PDF's JSON has trailing commas in `meta` (invalid); the example above was corrected. The size of the data set is not specified, but "30 items by default" in the listing suggests at least 30 products.

## 6. API

Include unit and other tests, GitHub Actions, etc. ("do your normal thing").

### Required endpoints

- [x] List all products (**30 items by default**)
- [x] Get a single product
- [x] Search products by name or description (exact string match, case-insensitive, is enough)
- [x] Add product (POST)
- [x] Update product (PUT or PATCH)
- [x] Remove product

### Optional endpoints

- [ ] Sorting/ordering — not done (T9 dropped; see README)
- [ ] Create a new product category — not done (T9 dropped; see README)
- [ ] List all product categories — not done (T9 dropped; see README)
- [ ] Get the category list — not done (T9 dropped; see README)
- [ ] List products by category — not done (T9 dropped; see README)

## 7. SPA

- [x] Interface that exercises the API, with reasonable design choices
- [x] Suggested example: dashboard on the home page with summaries of all products, plus options to view details, create, edit and delete products

## 8. Extra feature (not specified)

After completing the specification, add **at least one** unspecified feature and explain:

- [x] What problem it solves
- [x] Who would use it
- [x] Why it was chosen

## 9. What will be evaluated (implicit criteria)

- Full stack competence
- Use of agentic coding tools
- How the candidate gains understanding of the problem, approaches solutions and **explains the process and results**
- Communication (README, AI.md, product decisions and assumptions)
