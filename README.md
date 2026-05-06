# Spendly — Intelligent Personal Finance Tracker

Spendly is a personal finance tracker for Indonesian students and fresh graduates. It records daily transactions, visualises spending patterns, and uses ML to predict financial status.

## Project Structure

```
spendly/
├── app/                    # Next.js frontend (pages & layouts)
├── components/             # React UI components
├── lib/                    # Shared utilities, mock data, API service
│   ├── api.ts              # Live API service (set USE_MOCK=false to activate)
│   └── mockData.ts         # Mock data (USE_MOCK=true by default)
├── server/                 # Express REST API (Node.js + MySQL)
│   ├── config/             # Database connection pool
│   ├── controllers/        # Route handlers
│   ├── db/                 # schema.sql + seed.sql
│   ├── middleware/         # Error handler, request validation
│   ├── routes/             # Express routers
│   └── tests/              # Jest + fast-check test suite
├── ml-api/                 # FastAPI ML stub (Python)
│   ├── app/
│   │   ├── main.py         # FastAPI app entry point
│   │   ├── routers/        # Prediction endpoints
│   │   └── schemas/        # Pydantic request/response models
│   └── tests/              # pytest + Hypothesis test suite
└── spendly.postman_collection.json  # Postman collection for manual testing
```

## Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.10+
- **MySQL** 8.0+

## Quick Start

### 1. Database Setup

Create a MySQL database and apply the schema and seed data:

```bash
mysql -u <your_user> -p -e "CREATE DATABASE IF NOT EXISTS spendly;"
mysql -u <your_user> -p spendly < server/db/schema.sql
mysql -u <your_user> -p spendly < server/db/seed.sql
```

### 2. Express API Server (port 3001)

```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials
npm install
npm run dev
```

The API will be available at `http://localhost:3001`.

### 3. FastAPI ML Stub (port 8000)

```bash
cd ml-api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The ML API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 4. Next.js Frontend (port 3000)

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

> **Note:** The frontend uses mock data by default (`USE_MOCK = true` in `lib/mockData.ts`).  
> Set `USE_MOCK = false` to switch to live API calls once all three services are running.

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in your values:

| Variable      | Description                  | Default     |
|---------------|------------------------------|-------------|
| `DB_HOST`     | MySQL host                   | `localhost` |
| `DB_PORT`     | MySQL port                   | `3306`      |
| `DB_USER`     | MySQL username               | `root`      |
| `DB_PASSWORD` | MySQL password               | *(empty)*   |
| `DB_NAME`     | MySQL database name          | `spendly`   |
| `PORT`        | Express server port          | `3001`      |

## API Endpoints

### Express API (`http://localhost:3001`)

| Method   | Endpoint                        | Description                          |
|----------|---------------------------------|--------------------------------------|
| `GET`    | `/api/transactions`             | List all transactions (optional `?month=YYYY-MM`) |
| `GET`    | `/api/transactions/:id`         | Get single transaction               |
| `POST`   | `/api/transactions`             | Create new transaction               |
| `PUT`    | `/api/transactions/:id`         | Update transaction                   |
| `DELETE` | `/api/transactions/:id`         | Delete transaction                   |
| `GET`    | `/api/categories`               | List all categories                  |
| `GET`    | `/api/summary/:user_id`         | Monthly income/expense totals        |

### FastAPI ML Stub (`http://localhost:8000`)

| Method | Endpoint              | Description                              |
|--------|-----------------------|------------------------------------------|
| `GET`  | `/health`             | Health check                             |
| `POST` | `/predict/spending`   | Predict next-month spending              |
| `POST` | `/predict/status`     | Classify status: AMAN / HATI-HATI / BOROS |

## Testing

### Express API (Jest + fast-check)

```bash
cd server
node node_modules/jest/bin/jest.js --forceExit
```

### FastAPI ML Stub (pytest + Hypothesis)

```bash
cd ml-api
pytest tests/ -v
```

### Manual Testing (Postman)

Import `spendly.postman_collection.json` into Postman. The collection includes all endpoints with example bodies and test assertions. Run the "POST create transaction (valid)" request first — it auto-saves the returned `transaction_id` for use in subsequent requests.

## Demo Data

The seed data (`server/db/seed.sql`) includes:

- **1 demo user**: Raihanah (`user-demo-001`), monthly income Rp 5,000,000
- **8 categories**: 6 expense (Makan, Transport, Belanja, Pendidikan, Hiburan, Lain-lain) + 2 income (Gaji, Freelance)
- **25 transactions**: July 2025, realistic IDR amounts
- **8 budget limits**: One per category for July 2025

## Switching from Mock to Live Data

1. Ensure all three services are running (steps 2–4 above)
2. Open `lib/mockData.ts`
3. Change `export const USE_MOCK = true` to `export const USE_MOCK = false`
4. Refresh the frontend

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | Next.js 16, React 19, Tailwind CSS |
| Backend API | Node.js, Express, MySQL2          |
| Database    | MySQL 8                           |
| ML API      | FastAPI, Pydantic, Uvicorn        |
| Testing     | Jest, fast-check, pytest, Hypothesis |
| Deployment  | Vercel (frontend), Railway/Render (backend) |
