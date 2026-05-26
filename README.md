# Spendly — Personal Finance Tracker

Intelligent personal finance tracker for Indonesian college students, powered by LSTM + Attention-based ML models.

## Architecture

| Service | Stack | Port |
|---------|-------|------|
| Frontend | Next.js 16 + Tailwind CSS | 3000 |
| REST API | Express + MySQL2 | 3001 |
| ML API | FastAPI + Keras (TensorFlow) | 8000 |

---

## Prerequisites

- Node.js 18+
- Python 3.11+
- MySQL 8+

---

## Local Setup

### 1. Clone & install frontend dependencies

```bash
git clone https://github.com/Jeff146354/DBS-Capstone.git
cd DBS-Capstone
npm install
```

### 2. Set up the Express API

```bash
cd server
npm install
cp .env.example .env
# Edit .env — set DB_PASSWORD to your MySQL root password
```

### 3. Run the database migration

```bash
cd server
node db/migrate.js
```

### 4. Install ML API dependencies

```bash
cd ml-api
pip install -r requirements.txt
```

> The Keras model files (`spendly_LSTM.keras`, `spendly_classifier.keras`) and scalers
> (`scaler_lstm.pkl`, `scaler_classification.pkl`) must be placed in `ml-api/models/`.

---

## Running Locally

Open **three terminals**:

```bash
# Terminal 1 — Frontend (http://localhost:3000)
npm run dev

# Terminal 2 — Express API (http://localhost:3001)
cd server && npm run dev

# Terminal 3 — ML API (http://localhost:8000)
cd ml-api && uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables

### `server/.env`

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=spendly
PORT=3001
```

---

## ML Models

The app uses two Keras models:

| Model | File | Purpose |
|-------|------|---------|
| LSTM Forecaster | `spendly_LSTM.keras` | Predicts next-month spending |
| Classifier | `spendly_classifier.keras` | Classifies status: AMAN / HATI-HATI / BOROS |

Both models and their fitted `StandardScaler` files must be placed in `ml-api/models/`.
Set `SPENDLY_USE_MODELS=0` to disable ML inference and use rule-based fallback (useful for testing).

---

## Running Tests

```bash
# ML API tests
cd ml-api
SPENDLY_USE_MODELS=0 pytest tests/ -v

# Express API tests
cd server
npm test
```
