# Implementation Plan: Spendly Backend Integration

## Overview

Wire the existing Next.js frontend to a real Express + MySQL backend and a FastAPI ML stub. Work proceeds in layers: scaffolding → database → Express API → FastAPI → frontend glue → Postman collection → tests. Each task builds on the previous one; no code is left unintegrated.

## Tasks

- [x] 1. Project scaffolding
  - Create `server/` directory with `package.json` (dependencies: `express`, `cors`, `mysql2`, `uuid`, `dotenv`; devDependencies: `jest`, `supertest`, `fast-check`, `nodemon`)
  - Create `server/.env.example` listing `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`
  - Create `ml-api/` directory with `requirements.txt` listing `fastapi`, `uvicorn`, `pydantic`, `hypothesis`, `pytest`, `httpx`
  - Create root `.gitignore` entries for `server/.env`, `server/node_modules/`, `ml-api/__pycache__/`, `ml-api/.pytest_cache/`
  - Create empty placeholder files to establish the full directory tree: `server/config/db.js`, `server/routes/transactions.js`, `server/routes/categories.js`, `server/routes/summary.js`, `server/controllers/transactionController.js`, `server/controllers/categoryController.js`, `server/controllers/summaryController.js`, `server/middleware/errorHandler.js`, `server/middleware/validateRequest.js`, `server/db/schema.sql`, `server/db/seed.sql`, `server/app.js`, `server/server.js`, `ml-api/main.py`, `ml-api/schemas/prediction.py`, `ml-api/routers/predict.py`
  - _Requirements: 1.1, 1.6_

- [x] 2. MySQL database config
  - Implement `server/config/db.js`: import `mysql2/promise`, call `createPool()` reading `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` from `process.env` with `connectionLimit: 10` and `waitForConnections: true`, export the pool
  - _Requirements: 1.5_

- [x] 3. Database schema
  - Write `server/db/schema.sql` with four `CREATE TABLE IF NOT EXISTS` statements: `users`, `categories`, `transactions`, `budgets`
  - `users`: `id VARCHAR(36) PK`, `name`, `email UNIQUE`, `monthly_income INT`, `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - `categories`: `id VARCHAR(36) PK`, `name UNIQUE`, `icon`, `type ENUM('expense','income')`, `color VARCHAR(7)`
  - `transactions`: `id VARCHAR(36) PK`, `user_id FK→users`, `category_id FK→categories`, `type ENUM('expense','income','transfer')`, `amount INT`, `account`, `payment_method ENUM('cash','transfer','e-wallet','credit')`, `note TEXT`, `date DATE`, `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - `budgets`: `id INT AUTO_INCREMENT PK`, `user_id FK→users`, `category_id FK→categories`, `monthly_limit INT`, `month VARCHAR(7)`, `UNIQUE KEY (user_id, category_id, month)`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Database seed data
  - Write `server/db/seed.sql` using `INSERT IGNORE` (idempotent) for all rows
  - Insert 1 demo user: `id='user-demo-001'`, `name='Raihanah'`, `monthly_income=5000000`
  - Insert 8 categories with correct names, emoji icons, types, and hex colors per the design table (Makan/🍽️/expense/#FF6B6B, Transport/🚗/expense/#4ECDC4, Belanja/🛍️/expense/#95E1D3, Pendidikan/📚/expense/#FFB3BA, Hiburan/🎮/expense/#A0E7E5, Lain-lain/📦/expense/#7FD8BE, Gaji/💼/income/#6BCB77, Freelance/💻/income/#4D96FF)
  - Insert at least 25 transactions dated within July 2025 covering a realistic mix of expense and income types; all amounts must be integers in the range 5000–3500000 IDR
  - Insert 8 budget rows (one per category) for `month='2025-07'` with realistic monthly limits
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Express middleware
  - Implement `server/middleware/errorHandler.js`: export a four-argument Express error handler that reads `err.status || 500` and responds with `{ success: false, error: err.message || 'Internal server error' }`
  - Implement `server/middleware/validateRequest.js`: export a function `validateTransaction(req, res, next)` that checks for the required fields `user_id`, `type`, `amount`, `category`, `account`, `payment_method`, `date`; if any are missing, call `next` with a 400 error; otherwise call `next()`
  - _Requirements: 1.3, 1.4, 2.8, 2.9_

- [x] 6. Category controller and routes
  - Implement `server/controllers/categoryController.js`: export `getAll(req, res, next)` that queries `SELECT id, name, icon, type, color FROM categories` and responds with `{ success: true, data: rows }`
  - Implement `server/routes/categories.js`: create an Express Router, mount `GET /` → `categoryController.getAll`, export the router
  - _Requirements: 3.1, 3.2_

- [x] 7. Summary controller and routes
  - Implement `server/controllers/summaryController.js`: export `getMonthlySummary(req, res, next)` that accepts `req.params.user_id`, queries `transactions` for the current calendar month filtering by `user_id`, aggregates `SUM(amount)` grouped by `type`, computes `total_income`, `total_expenses`, and `balance = total_income - total_expenses`, and responds with `{ success: true, data: { total_income, total_expenses, balance } }`; if no rows exist return zeros
  - Implement `server/routes/summary.js`: create an Express Router, mount `GET /:user_id` → `summaryController.getMonthlySummary`, export the router
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Transaction controller and routes
  - Implement `server/controllers/transactionController.js` with five exported functions:
    - `getAll(req, res, next)`: SELECT transactions JOIN categories (for `category` name and `category_icon`), ordered by `date DESC`; if `req.query.month` is provided (format `YYYY-MM`), filter with `YEAR(date)=Y AND MONTH(date)=M`; respond `{ success: true, data: rows }`
    - `getById(req, res, next)`: SELECT single transaction by `id`; if not found, call `next` with a 404 error
    - `create(req, res, next)`: generate a UUID with the `uuid` package, resolve `category_id` by looking up `categories` by name, INSERT the row, SELECT the inserted row (with JOIN), respond HTTP 201 with `{ success: true, data: row }`
    - `update(req, res, next)`: UPDATE the transaction by `id`, SELECT the updated row, respond `{ success: true, data: row }`; if not found, 404
    - `remove(req, res, next)`: DELETE by `id`, respond `{ success: true, data: null }`; if not found, 404
  - Implement `server/routes/transactions.js`: create an Express Router, apply `validateTransaction` middleware to POST and PUT routes, mount all five CRUD routes, export the router
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 9. Express app.js and server.js wiring
  - Implement `server/app.js`: import `express`, `cors`, all three routers, and `errorHandler`; configure `cors({ origin: 'http://localhost:5173' })`; add `express.json()` middleware; mount routers at `/api/transactions`, `/api/categories`, `/api/summary`; add `errorHandler` as the last middleware; export the app
  - Implement `server/server.js`: import `dotenv/config`, import the app, read `process.env.PORT || 3001`, call `app.listen(PORT)` and log the port
  - Add `"start": "node server.js"` and `"dev": "nodemon server.js"` scripts to `server/package.json`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 10. Checkpoint — Express API smoke test
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. FastAPI ML stub
  - Implement `ml-api/schemas/prediction.py`: define four Pydantic models — `SpendingRequest` (`user_id: str`, `current_spending: int`), `SpendingResponse` (`predicted_amount: int`, `currency: str`, `month: str`), `StatusRequest` (`user_id: str`, `current_spending: int`, `monthly_income: int`), `StatusResponse` (`status: Literal["AMAN","HATI-HATI","BOROS"]`, `confidence: float`, `reason: str`)
  - Implement `ml-api/routers/predict.py`: create an `APIRouter`, implement `POST /spending` and `POST /status` with stub logic and `# TODO: replace with model.predict(input_features)` comments as specified in the design
  - Implement `ml-api/main.py`: create the FastAPI app, add `GET /health` returning `{"status": "ok"}`, include the predict router with prefix `/predict`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 12. Frontend API service layer (`lib/api.ts`)
  - Create `lib/api.ts` exporting five async functions: `getTransactions(month?: string)`, `addTransaction(payload)`, `getCategories()`, `getMonthlySummary(userId: string)`, `getPrediction(userId: string, currentSpending: number, monthlyIncome: number)`
  - Use `API_BASE = 'http://localhost:3001/api'` and `ML_BASE = 'http://localhost:8000'` as base URLs
  - Each function fetches the appropriate endpoint, checks `json.success`, throws `new Error(json.error)` on failure, and returns `json.data` (or the full response for `getPrediction`)
  - `getTransactions` appends `?month=${month}` when the parameter is provided
  - `addTransaction` and `getPrediction` use `method: 'POST'` with `Content-Type: application/json`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 13. Frontend mock data toggle (`lib/mockData.ts`)
  - Prepend `export const USE_MOCK = true  // set to false to use live API` as the very first line of `lib/mockData.ts`
  - Do NOT modify any other line in the file — all existing interfaces, arrays, and helper functions must remain exactly as-is
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 14. Postman collection file
  - Create `spendly.postman_collection.json` at the repo root as a valid Postman Collection v2.1 JSON file
  - Include an environment variables section defining `base_url`, `ml_url`, `demo_user_id`, and `transaction_id`
  - Structure the collection with two folders: "Express API (localhost:3001)" and "ML API (localhost:8000)"
  - Express API folder must contain all 9 requests: GET /api/transactions (list all), GET /api/transactions?month=2025-07 (filtered), GET /api/transactions/:id (single), POST /api/transactions (valid body), POST /api/transactions (missing fields → 400), PUT /api/transactions/:id (update), DELETE /api/transactions/:id (delete), GET /api/categories, GET /api/summary/{{demo_user_id}}
  - ML API folder must contain 4 requests: GET /health, POST /predict/spending, POST /predict/status (valid), POST /predict/status (invalid body → 422)
  - The POST /api/transactions (valid body) request must include a Postman test script that extracts the returned `id` and sets `pm.environment.set("transaction_id", ...)` so subsequent requests can reference `{{transaction_id}}`
  - Each request must include example request bodies (where applicable) and at least one Postman test assertion (e.g., `pm.test("Status is 200", () => pm.response.to.have.status(200))`)
  - _Requirements: (design: Manual Testing — Postman Collection)_

- [x] 15. Property-based tests — Express envelope shape (P1, P2)
  - [x] 15.1 Create `server/tests/envelope.property.test.js`
    - Write a fast-check property test for P1: for any valid GET request to `/api/transactions`, `/api/categories`, or `/api/summary/user-demo-001`, the response body contains `success: true` and a `data` field
    - Write a fast-check property test for P2: for any request that triggers an error (e.g., POST with missing fields, GET unknown id), the response body contains `success: false` and a non-empty `error` string, with HTTP status ≥ 400
    - Tag each test with `// Feature: spendly-backend-integration, Property N: ...`
    - _Requirements: 1.3, 1.4_

  - [x] 15.2 Write unit tests for envelope middleware
    - Test `errorHandler` directly: given an error object with `status` and `message`, verify the response shape
    - _Requirements: 1.3, 1.4_

- [x] 16. Property-based tests — Transaction endpoints (P3–P8)
  - [x] 16.1 Create `server/tests/transactions.property.test.js`
    - **Property 3: Transactions are ordered by date descending** — generate arbitrary sets of transactions, insert them, call GET /api/transactions, assert every adjacent pair satisfies `t[i].date >= t[i+1].date`
    - **Property 4: Month filter returns only in-month transactions** — for any `YYYY-MM` value, assert every returned transaction's date year+month matches the query parameter
    - **Property 5: Transaction create-then-fetch round trip** — for any valid transaction payload, POST it, then GET by the returned id, assert fields match and id is a valid UUID (RFC 4122)
    - **Property 6: Transaction delete removes it from the store** — POST a transaction, DELETE it, assert subsequent GET returns 404
    - **Property 8: Transaction response shape contains all required fields** — for any transaction returned from any endpoint, assert presence of `id`, `user_id`, `type`, `amount`, `category`, `category_icon`, `account`, `payment_method`, `date`, `created_at`
    - Tag each test with `// Feature: spendly-backend-integration, Property N: ...`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.7, 2.10_

  - [x] 16.2 Write unit tests for transaction controller
    - Test `getAll` with and without `?month` filter using a mock pool
    - Test `getById` 404 path
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 17. Property-based tests — Validation (P7)
  - [x] 17.1 Create `server/tests/validation.property.test.js`
    - **Property 7: Missing required fields returns HTTP 400** — use fast-check to generate POST bodies with one or more required fields (`user_id`, `type`, `amount`, `category`, `account`, `payment_method`, `date`) omitted; assert HTTP 400 and `{ success: false, error: <non-empty string> }`
    - Tag with `// Feature: spendly-backend-integration, Property 7: ...`
    - _Requirements: 2.8, 2.9_

  - [x] 17.2 Write unit tests for validateRequest middleware
    - Test all seven required fields individually
    - _Requirements: 2.8, 2.9_

- [x] 18. Property-based tests — Categories (P9)
  - [x] 18.1 Create `server/tests/categories.property.test.js`
    - **Property 9: Category response shape contains all required fields** — call GET /api/categories, for each returned object assert presence of `id`, `name`, `icon`, `type`, `color`
    - Tag with `// Feature: spendly-backend-integration, Property 9: ...`
    - _Requirements: 3.2_

- [x] 19. Property-based tests — Summary (P10)
  - [x] 19.1 Create `server/tests/summary.property.test.js`
    - **Property 10: Monthly summary correctly aggregates income and expenses** — insert arbitrary sets of income and expense transactions for the current month, call GET /api/summary/:user_id, assert `total_income` equals sum of income amounts, `total_expenses` equals sum of expense amounts, `balance` equals `total_income - total_expenses`
    - Tag with `// Feature: spendly-backend-integration, Property 10: ...`
    - _Requirements: 4.1, 4.2_

  - [x] 19.2 Write unit test for empty-month summary
    - Assert GET /api/summary/:user_id returns `{ total_income: 0, total_expenses: 0, balance: 0 }` when no transactions exist for the user in the current month
    - _Requirements: 4.3_

- [x] 20. Property-based tests — FastAPI ML stub (P11–P13)
  - [x] 20.1 Create `ml-api/tests/test_predict.py`
    - **Property 11: Spending prediction response shape and value constraints** — use Hypothesis `@given` to generate valid `SpendingRequest` inputs; assert `predicted_amount > 0`, `currency == "IDR"`, and `month` matches `^\d{4}-\d{2}$` representing the next calendar month
    - **Property 12: Status prediction response shape and value constraints** — use Hypothesis `@given` to generate valid `StatusRequest` inputs; assert `status` ∈ `{"AMAN","HATI-HATI","BOROS"}`, `0.0 <= confidence <= 1.0`, and `reason` is a non-empty string
    - **Property 13: Invalid ML API request returns HTTP 422** — use Hypothesis to generate bodies missing required fields or with wrong types; assert HTTP 422 response
    - Tag each test with `# Feature: spendly-backend-integration, Property N: ...`
    - _Requirements: 7.2, 7.3, 7.6_

  - [x] 20.2 Write unit tests for FastAPI health and known-good examples
    - Test GET /health returns `{"status": "ok"}`
    - Test POST /predict/spending with a known payload returns the expected shape
    - Test POST /predict/status with ratio ≤ 0.7 returns `AMAN`, 0.7–0.9 returns `HATI-HATI`, > 0.9 returns `BOROS`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 21. Property-based tests — Frontend API service (P14, P15)
  - [x] 21.1 Create `lib/__tests__/api.property.test.ts`
    - **Property 14: `addTransaction` sends the correct payload** — use fast-check to generate valid transaction payload objects; mock `fetch`; call `addTransaction(payload)`; assert exactly one POST to `http://localhost:3001/api/transactions` with `Content-Type: application/json` and body equal to `JSON.stringify(payload)`
    - **Property 15: `getMonthlySummary` constructs the correct URL for any userId** — use fast-check to generate non-empty `userId` strings; mock `fetch`; call `getMonthlySummary(userId)`; assert the fetch URL is exactly `http://localhost:3001/api/summary/${userId}`
    - Tag each test with `// Feature: spendly-backend-integration, Property N: ...`
    - _Requirements: 8.3, 8.5_

  - [x] 21.2 Write unit tests for remaining API service functions
    - Test `getTransactions()` without month calls the correct URL
    - Test `getTransactions('2025-07')` appends `?month=2025-07`
    - Test `getCategories()` calls the correct URL
    - Test `getPrediction()` calls `http://localhost:8000/predict/status` with POST
    - Test that each function throws when `json.success` is false
    - _Requirements: 8.1, 8.2, 8.4, 8.6, 8.7_

- [x] 22. Checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Root README.md
  - Create `README.md` at the repo root with sections: Prerequisites, Quick Start (all three services), Database Setup (schema + seed CLI commands), Environment Variables, and Project Structure
  - Include exact commands: `cd server && npm install && npm run dev`, `cd ml-api && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`, and the Next.js client start command
  - Include MySQL CLI commands for applying schema and seed: `mysql -u <user> -p <db> < server/db/schema.sql` and `mysql -u <user> -p <db> < server/db/seed.sql`
  - List all required environment variables and reference `server/.env.example`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 24. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests (P1–P15) map directly to the Correctness Properties in the design document
- The `USE_MOCK` flag in `lib/mockData.ts` defaults to `true`; set it to `false` once all three services are running to switch the frontend to live data
- No `.tsx`, `.css`, or asset files are modified — only `lib/mockData.ts` (one prepended line) and the new `lib/api.ts`
- The Postman collection at `spendly.postman_collection.json` can be imported directly into Postman for manual smoke testing
