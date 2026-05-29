/**
 * API service layer for Spendly backend integration.
 * Base URLs point to the Express API (port 3001) and FastAPI ML stub (port 8000).
 */

import { API_BASE, ML_BASE } from '@/lib/config'

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

/** The 16 engineered features for a single transaction snapshot (v2 model). */
export interface TransactionFeatures {
  // Original 12 features
  amount: number
  week_of_month: number
  day_of_month: number
  month_budget: number
  daily_budget: number
  cum_expense_daily: number
  cum_expense_monthly: number
  current_budget: number
  spending_ratio: number
  trx_frequency: number
  rolling_avg_7d: number
  expense_acceleration: number
  // 4 new monthly aggregate features (v2)
  avg_daily_expense: number
  total_trx_month: number
  max_single_trx: number
  std_daily_expense: number
}

interface APISpendingForecast {
  predicted_amount: number
  currency: string
  month: string // YYYY-MM
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
 * Classify financial status from a single transaction snapshot.
 * Returns AMAN / HATI-HATI / BOROS with confidence and reason.
 */
export async function getPrediction(
  features: TransactionFeatures
): Promise<APIPredictionStatus> {
  const res = await fetch(`${ML_BASE}/predict/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
  })
  return res.json()
}

/**
 * POST /predict/spending
 * Predict next month's total spending using the LSTM model.
 * Requires a sequence of exactly 7 transaction snapshots (oldest → newest).
 */
export async function getSpendingForecast(
  sequence: TransactionFeatures[]
): Promise<APISpendingForecast> {
  if (sequence.length !== 7) {
    throw new Error('LSTM forecast requires exactly 7 transaction snapshots')
  }
  const res = await fetch(`${ML_BASE}/predict/spending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence }),
  })
  return res.json()
}

/**
 * Helper: build a TransactionFeatures object from raw transaction data.
 * Call this to construct the features dict before calling getPrediction or getSpendingForecast.
 */
export function buildTransactionFeatures(params: {
  amount: number
  dayOfMonth: number
  weekOfMonth: number
  monthBudget: number
  dailyBudget: number
  cumExpenseDaily: number
  cumExpenseMonthly: number
  trxFrequency: number
  rollingAvg7d: number
  expenseAcceleration: number
}): TransactionFeatures {
  const currentBudget = params.monthBudget - params.cumExpenseMonthly
  const spendingRatio = params.monthBudget > 0
    ? params.cumExpenseMonthly / params.monthBudget
    : 0

  return {
    amount: params.amount,
    week_of_month: params.weekOfMonth,
    day_of_month: params.dayOfMonth,
    month_budget: params.monthBudget,
    daily_budget: params.dailyBudget,
    cum_expense_daily: params.cumExpenseDaily,
    cum_expense_monthly: params.cumExpenseMonthly,
    current_budget: currentBudget,
    spending_ratio: spendingRatio,
    trx_frequency: params.trxFrequency,
    rolling_avg_7d: params.rollingAvg7d,
    expense_acceleration: params.expenseAcceleration,
  }
}
