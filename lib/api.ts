/**
 * API service layer for Spendly backend integration.
 * Base URLs point to the Express API (port 3001) and FastAPI ML stub (port 8000).
 */

const API_BASE = 'http://localhost:3001/api'
const ML_BASE = 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────────────────────
// Types matching the backend API response shapes
// ─────────────────────────────────────────────────────────────────────────────

interface APITransaction {
  id: string
  user_id: string
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category: string
  category_icon: string
  account: string
  payment_method: 'cash' | 'transfer' | 'e-wallet' | 'credit'
  note?: string
  date: string // YYYY-MM-DD
  created_at: string
}

interface APICategory {
  id: string
  name: string
  icon: string
  type: 'expense' | 'income'
  color: string
}

interface APIMonthlySummary {
  total_income: number
  total_expenses: number
  balance: number
}

interface APIPredictionStatus {
  status: 'AMAN' | 'HATI-HATI' | 'BOROS'
  confidence: number
  reason: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: check API response envelope
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const json = await res.json()

  // Express API uses { success: true, data: ... } envelope
  if ('success' in json) {
    if (!json.success) {
      throw new Error(json.error || 'API request failed')
    }
    return json.data as T
  }

  // FastAPI returns data directly (no envelope)
  return json as T
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported API functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/transactions
 * Optional month filter: YYYY-MM
 */
export async function getTransactions(month?: string): Promise<APITransaction[]> {
  const url = month
    ? `${API_BASE}/transactions?month=${month}`
    : `${API_BASE}/transactions`
  return fetchAPI<APITransaction[]>(url)
}

/**
 * POST /api/transactions
 * Create a new transaction.
 */
export async function addTransaction(payload: {
  user_id: string
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category: string
  account: string
  payment_method: 'cash' | 'transfer' | 'e-wallet' | 'credit'
  note?: string
  date: string // YYYY-MM-DD
}): Promise<APITransaction> {
  return fetchAPI<APITransaction>(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * GET /api/categories
 * Returns all categories.
 */
export async function getCategories(): Promise<APICategory[]> {
  return fetchAPI<APICategory[]>(`${API_BASE}/categories`)
}

/**
 * GET /api/summary/:userId
 * Returns monthly totals for the given user.
 */
export async function getMonthlySummary(userId: string): Promise<APIMonthlySummary> {
  return fetchAPI<APIMonthlySummary>(`${API_BASE}/summary/${userId}`)
}

/**
 * POST /predict/status
 * Returns financial status prediction (AMAN / HATI-HATI / BOROS).
 */
export async function getPrediction(
  userId: string,
  currentSpending: number,
  monthlyIncome: number
): Promise<APIPredictionStatus> {
  const res = await fetch(`${ML_BASE}/predict/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      current_spending: currentSpending,
      monthly_income: monthlyIncome,
    }),
  })
  return res.json()
}
