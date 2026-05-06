# Requirements Document

## Introduction

Spendly is an intelligent personal finance tracker targeting Indonesian students and fresh graduates (ages 18–27). The frontend already exists as a Next.js + React application using mock data. This spec covers the backend and integration layer: an Express REST API backed by MySQL, a FastAPI ML stub for spending predictions, and the minimal frontend wiring needed to connect the two. Authentication is explicitly out of scope for this phase.

## Glossary

- **API_Server**: The Node.js + Express backend running on port 3001
- **ML_API**: The FastAPI Python service running on port 8000 that provides spending predictions
- **Database**: The MySQL instance storing users, categories, transactions, and budgets
- **Client**: The existing Next.js + React frontend running on port 3000 (or Vite on 5173)
- **Transaction**: A single financial event with type `expense`, `income`, or `transfer`
- **Category**: A named spending or income group (e.g., Makan, Transport, Gaji) with an associated icon and color
- **Budget**: A monthly spending limit set per category for a given user
- **Summary**: Aggregated monthly totals — income, expenses, and net balance — for a user
- **Prediction**: An ML-generated forecast of next-month spending or a financial status label
- **USE_MOCK**: A boolean flag in `lib/mockData.ts` that controls whether the Client uses mock data or live API calls
- **IDR**: Indonesian Rupiah, the currency used throughout the application
- **Financial_Status**: One of three labels — `AMAN` (safe), `HATI-HATI` (caution), or `BOROS` (overspending)

---

## Requirements

### Requirement 1: Express REST API Server

**User Story:** As a frontend developer, I want a running Express server that the Client can call, so that real transaction data replaces mock data without changing the UI.

#### Acceptance Criteria

1. THE API_Server SHALL listen on port 3001 by default, configurable via the `PORT` environment variable.
2. THE API_Server SHALL enable CORS for the origin `http://localhost:5173` to allow the Vite dev server to make cross-origin requests.
3. WHEN a request is received, THE API_Server SHALL respond with a JSON envelope of the form `{ "success": true, "data": ... }` for successful responses.
4. WHEN an error occurs during request processing, THE API_Server SHALL respond with a JSON envelope of the form `{ "success": false, "error": "<message>" }` and an appropriate HTTP status code.
5. THE API_Server SHALL read all database connection parameters (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) from environment variables.
6. THE API_Server SHALL provide a `.env.example` file listing all required environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `PORT`.

---

### Requirement 2: Transaction Endpoints

**User Story:** As a user, I want to create, view, update, and delete my financial transactions, so that my spending history is accurately recorded and retrievable.

#### Acceptance Criteria

1. WHEN a `GET /api/transactions` request is received, THE API_Server SHALL return all transactions for the authenticated context, ordered by date descending.
2. WHEN a `GET /api/transactions` request includes a `?month=YYYY-MM` query parameter, THE API_Server SHALL return only transactions whose `date` falls within that calendar month.
3. WHEN a `GET /api/transactions/:id` request is received, THE API_Server SHALL return the single transaction matching the given `id`.
4. IF no transaction exists for the given `id`, THEN THE API_Server SHALL return HTTP 404 with `{ "success": false, "error": "Transaction not found" }`.
5. WHEN a `POST /api/transactions` request is received with a valid body, THE API_Server SHALL insert the transaction into the Database, generate a UUID for the `id` field, and return the created transaction with HTTP 201.
6. WHEN a `PUT /api/transactions/:id` request is received with a valid body, THE API_Server SHALL update the matching transaction in the Database and return the updated transaction.
7. WHEN a `DELETE /api/transactions/:id` request is received, THE API_Server SHALL remove the matching transaction from the Database and return HTTP 200 with `{ "success": true, "data": null }`.
8. THE API_Server SHALL validate that each Transaction body contains the fields `user_id`, `type`, `amount`, `category`, `account`, `payment_method`, and `date`.
9. IF a required Transaction field is missing or invalid, THEN THE API_Server SHALL return HTTP 400 with a descriptive error message.
10. THE API_Server SHALL represent each Transaction in responses with the fields: `id` (UUID string), `user_id`, `type` (`expense | income | transfer`), `amount` (integer IDR), `category` (string), `category_icon` (string), `account` (string), `payment_method` (`cash | transfer | e-wallet | credit`), `note` (string, optional), `date` (ISO date string `YYYY-MM-DD`), and `created_at` (timestamp).

---

### Requirement 3: Category Endpoints

**User Story:** As a user, I want to retrieve the list of spending and income categories, so that I can assign the correct category when recording a transaction.

#### Acceptance Criteria

1. WHEN a `GET /api/categories` request is received, THE API_Server SHALL return all categories from the Database.
2. THE API_Server SHALL represent each category with the fields: `id`, `name`, `icon`, `type` (`expense | income`), and `color`.

---

### Requirement 4: Monthly Summary Endpoint

**User Story:** As a user, I want to see my monthly income, expenses, and net balance, so that I can understand my overall financial health at a glance.

#### Acceptance Criteria

1. WHEN a `GET /api/summary/:user_id` request is received, THE API_Server SHALL return aggregated totals for the current calendar month: `total_income`, `total_expenses`, and `balance` (income minus expenses).
2. THE API_Server SHALL compute the Summary by querying only transactions belonging to the specified `user_id` within the current month.
3. IF no transactions exist for the given `user_id` in the current month, THEN THE API_Server SHALL return `{ "total_income": 0, "total_expenses": 0, "balance": 0 }`.

---

### Requirement 5: MySQL Database Schema

**User Story:** As a backend developer, I want a well-defined database schema, so that all application data is stored consistently and can be queried efficiently.

#### Acceptance Criteria

1. THE Database SHALL contain a `users` table with columns: `id` (VARCHAR primary key), `name`, `email`, `monthly_income` (integer IDR), and `created_at` (timestamp).
2. THE Database SHALL contain a `categories` table with columns: `id` (VARCHAR primary key), `name`, `icon`, `type` (`expense | income`), and `color`.
3. THE Database SHALL contain a `transactions` table with columns: `id` (UUID primary key), `user_id` (foreign key → users), `category_id` (foreign key → categories), `type`, `amount` (integer), `account`, `payment_method`, `note`, `date` (DATE), and `created_at` (timestamp).
4. THE Database SHALL contain a `budgets` table with columns: `id` (primary key), `user_id` (foreign key → users), `category_id` (foreign key → categories), `monthly_limit` (integer IDR), and `month` (VARCHAR in `YYYY-MM` format).
5. THE Database schema file (`schema.sql`) SHALL be idempotent — it SHALL use `CREATE TABLE IF NOT EXISTS` so it can be re-run without error.

---

### Requirement 6: Database Seed Data

**User Story:** As a developer, I want realistic seed data in IDR, so that the frontend displays meaningful content during development and demos.

#### Acceptance Criteria

1. THE Database seed file (`seed.sql`) SHALL insert exactly 1 demo user.
2. THE Database seed file SHALL insert exactly 8 categories matching the names used by the existing frontend. The 6 expense categories (type = `expense`, money out) are: `Makan`, `Transport`, `Belanja`, `Pendidikan`, `Hiburan`, and `Lain-lain` (miscellaneous). The 2 income categories (type = `income`, money in) are: `Gaji` and `Freelance`.
3. THE Database seed file SHALL insert at least 25 transactions dated within July 2025, covering a realistic mix of `expense` and `income` types.
4. THE Database seed file SHALL insert budget limits for each of the 8 categories for the month `2025-07`.
5. WHEN the seed file is applied, all transaction amounts SHALL be integers in IDR within the range Rp 5,000 – Rp 3,500,000.

---

### Requirement 7: FastAPI ML Stub

**User Story:** As a frontend developer, I want ML prediction endpoints available immediately, so that the AI Insights section of the dashboard can display data even before the real model is trained.

#### Acceptance Criteria

1. THE ML_API SHALL expose a `GET /health` endpoint that returns HTTP 200 with `{ "status": "ok" }`.
2. WHEN a `POST /predict/spending` request is received, THE ML_API SHALL return a JSON response with the fields `predicted_amount` (integer IDR), `currency` (`"IDR"`), and `month` (string in `YYYY-MM` format for the next calendar month).
3. WHEN a `POST /predict/status` request is received, THE ML_API SHALL return a JSON response with the fields `status` (one of `AMAN`, `HATI-HATI`, `BOROS`), `confidence` (float between 0 and 1), and `reason` (string).
4. THE ML_API SHALL run on port 8000.
5. THE ML_API SHALL mark every stub prediction implementation with the comment `# TODO: replace with model.predict(input_features)` to indicate where the real LSTM model will be integrated.
6. THE ML_API SHALL use Pydantic schemas to validate all request and response bodies.

---

### Requirement 8: Frontend API Service Layer

**User Story:** As a frontend developer, I want a dedicated API service module, so that all HTTP calls are centralised and the UI components do not need to change when switching from mock to live data.

#### Acceptance Criteria

1. THE Client SHALL provide a file `lib/api.ts` (or `src/services/api.js` per the project layout) that exports async functions: `getTransactions(month?)`, `addTransaction(payload)`, `getCategories()`, `getMonthlySummary(userId)`, and `getPrediction(userId)`.
2. THE `getTransactions` function SHALL call `GET /api/transactions` on the API_Server, passing the optional `month` parameter as a query string when provided.
3. THE `addTransaction` function SHALL call `POST /api/transactions` on the API_Server with the transaction payload as the request body.
4. THE `getCategories` function SHALL call `GET /api/categories` on the API_Server.
5. THE `getMonthlySummary` function SHALL call `GET /api/summary/:userId` on the API_Server.
6. THE `getPrediction` function SHALL call `POST /predict/status` on the ML_API at `http://localhost:8000`.
7. THE Client API service SHALL use `http://localhost:3001/api` as the base URL for all API_Server calls.

---

### Requirement 9: Mock Data Toggle

**User Story:** As a developer, I want a single flag to switch between mock and live data, so that the UI remains functional during development even when the backend is unavailable.

#### Acceptance Criteria

1. THE Client SHALL export a constant `USE_MOCK` (boolean) from `lib/mockData.ts` as the first export in the file.
2. WHEN `USE_MOCK` is `true`, THE Client SHALL use the existing mock data arrays and helper functions without making any network requests.
3. THE Client SHALL NOT remove or modify any existing mock data arrays or helper functions in `lib/mockData.ts`.
4. THE Client SHALL NOT modify any `.tsx` component files, CSS files, or asset files other than `lib/mockData.ts` and the new API service file.

---

### Requirement 10: Project README

**User Story:** As a new team member, I want clear setup instructions for all three services, so that I can get the full stack running locally without guessing.

#### Acceptance Criteria

1. THE README SHALL include step-by-step instructions to start the API_Server: `cd server && npm install && npm run dev`.
2. THE README SHALL include step-by-step instructions to start the ML_API: `cd ml-api && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`.
3. THE README SHALL include step-by-step instructions to start the Client: `cd client && npm install && npm run dev` (or the equivalent for the Next.js root layout).
4. THE README SHALL include instructions for applying the database schema and seed data against a local MySQL instance using the MySQL CLI.
5. THE README SHALL list all required environment variables and reference the `.env.example` file in the server directory.
