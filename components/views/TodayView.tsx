'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, getGreeting, getSpendingStatus } from '@/lib/mockData'
import TransactionCard from '@/components/TransactionCard'
import StatusBadge from '@/components/StatusBadge'
import ProgressBar from '@/components/ProgressBar'
import AddTransactionModal from '@/components/AddTransactionModal'
import type { UserSession } from '@/app/page'
import type { TransactionFeatures } from '@/lib/api'

const API_BASE = 'http://localhost:3001/api'
const ML_BASE  = 'http://localhost:8000'

interface APITransaction {
  id: string
  user_id: string
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category: string
  category_icon: string
  account: string
  payment_method: string
  note?: string
  date: string // YYYY-MM-DD
}

interface MLStatus {
  status: 'AMAN' | 'HATI-HATI' | 'BOROS'
  confidence: number
  reason: string
}

interface MLForecast {
  predicted_amount: number
  currency: string
  month: string
}

interface TodayViewProps {
  session: UserSession
}

// ─── Feature engineering helpers ────────────────────────────────────────────

function getWeekOfMonth(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.ceil(d.getDate() / 7)
}

function getDayOfMonth(dateStr: string): number {
  return new Date(dateStr).getDate()
}

/**
 * Build the 12-feature snapshot for a given day from the full transaction list.
 * Uses the same feature definitions as the training notebook.
 */
function buildFeatures(
  targetDate: string,
  allMonthTx: APITransaction[],
  monthBudget: number,
  dailyBudget: number,
): TransactionFeatures {
  const expenses = allMonthTx.filter(t => t.type === 'expense')

  // Cumulative expense for the target day
  const dayExpenses = expenses.filter(t => t.date === targetDate)
  const cumExpenseDaily = dayExpenses.reduce((s, t) => s + t.amount, 0)

  // Cumulative expense for the month up to and including target date
  const cumExpenseMonthly = expenses
    .filter(t => t.date <= targetDate)
    .reduce((s, t) => s + t.amount, 0)

  const currentBudget = monthBudget - cumExpenseMonthly
  const spendingRatio = monthBudget > 0 ? cumExpenseMonthly / monthBudget : 0

  // Transaction frequency on target day
  const trxFrequency = allMonthTx.filter(t => t.date === targetDate).length

  // 7-day rolling average of daily expense ending on targetDate
  const rollingAvg7d = (() => {
    const target = new Date(targetDate)
    let total = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(target)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      total += expenses.filter(t => t.date === ds).reduce((s, t) => s + t.amount, 0)
    }
    return total / 7
  })()

  // Expense acceleration: today's total minus yesterday's total
  const yesterday = (() => {
    const d = new Date(targetDate)
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()
  const yesterdayTotal = expenses.filter(t => t.date === yesterday).reduce((s, t) => s + t.amount, 0)
  const expenseAcceleration = cumExpenseDaily - yesterdayTotal

  // Representative amount: average transaction amount on target day (or 0)
  const amount = dayExpenses.length > 0
    ? dayExpenses.reduce((s, t) => s + t.amount, 0) / dayExpenses.length
    : 0

  return {
    amount,
    week_of_month: getWeekOfMonth(targetDate),
    day_of_month: getDayOfMonth(targetDate),
    month_budget: monthBudget,
    daily_budget: dailyBudget,
    cum_expense_daily: cumExpenseDaily,
    cum_expense_monthly: cumExpenseMonthly,
    current_budget: currentBudget,
    spending_ratio: spendingRatio,
    trx_frequency: trxFrequency,
    rolling_avg_7d: rollingAvg7d,
    expense_acceleration: expenseAcceleration,
  }
}

/**
 * Build a 7-day sequence ending on targetDate for the LSTM model.
 */
function buildSequence(
  targetDate: string,
  allMonthTx: APITransaction[],
  monthBudget: number,
  dailyBudget: number,
): TransactionFeatures[] {
  const seq: TransactionFeatures[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(targetDate)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    seq.push(buildFeatures(ds, allMonthTx, monthBudget, dailyBudget))
  }
  return seq
}

// ─── Status label helpers ────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  AMAN: 'Aman',
  'HATI-HATI': 'Hati-hati',
  BOROS: 'Boros',
}

const STATUS_COLOR: Record<string, string> = {
  AMAN: 'text-success',
  'HATI-HATI': 'text-warning',
  BOROS: 'text-danger',
}

const STATUS_BG: Record<string, string> = {
  AMAN: 'border-success/30 bg-success/5',
  'HATI-HATI': 'border-warning/30 bg-warning/5',
  BOROS: 'border-danger/30 bg-danger/5',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TodayView({ session }: TodayViewProps) {
  const [transactions, setTransactions] = useState<APITransaction[]>([])
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // ML state
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null)
  const [mlForecast, setMlForecast] = useState<MLForecast | null>(null)
  const [mlLoading, setMlLoading] = useState(false)
  const [mlError, setMlError] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)

  // Daily budget derived from monthly income
  const dailyBudget = session.monthlyIncome > 0 ? Math.round(session.monthlyIncome / 30) : 200000
  const monthBudget = session.monthlyIncome

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/transactions?user_id=${session.userId}&month=${currentMonth}`),
        fetch(`${API_BASE}/summary/${session.userId}`),
      ])
      const [txJson, sumJson] = await Promise.all([txRes.json(), sumRes.json()])
      if (txJson.success) setTransactions(txJson.data)
      if (sumJson.success) setSummary(sumJson.data)
    } catch { }
    finally { setLoading(false) }
  }, [session.userId, currentMonth])

  useEffect(() => { fetchData() }, [fetchData])

  // Call ML API once transactions are loaded
  useEffect(() => {
    if (loading || transactions.length === 0) return

    async function fetchML() {
      setMlLoading(true)
      setMlError(false)
      try {
        const features = buildFeatures(today, transactions, monthBudget, dailyBudget)
        const sequence = buildSequence(today, transactions, monthBudget, dailyBudget)

        const [statusRes, forecastRes] = await Promise.all([
          fetch(`${ML_BASE}/predict/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(features),
          }),
          fetch(`${ML_BASE}/predict/spending`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence }),
          }),
        ])

        const [statusData, forecastData] = await Promise.all([
          statusRes.json(),
          forecastRes.json(),
        ])

        if (statusData.status)           setMlStatus(statusData)
        if (forecastData.predicted_amount) setMlForecast(forecastData)
      } catch {
        setMlError(true)
      } finally {
        setMlLoading(false)
      }
    }

    fetchML()
  }, [loading, transactions, today, monthBudget, dailyBudget])

  const todayTransactions = transactions.filter(t => t.date === today)
  const todaySpending = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const status = getSpendingStatus(todaySpending, dailyBudget)
  const greeting = getGreeting()

  return (
    <>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-text-secondary text-sm">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-text-primary">
            Selamat {greeting}, {session.userName} 👋
          </h1>
        </div>

        {/* Daily Spending Card */}
        <div className="card-glass p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-text-secondary text-sm mb-1">Pengeluaran Harian</p>
              <p className="font-mono text-2xl font-bold text-accent">{formatCurrency(todaySpending)}</p>
            </div>
            <StatusBadge status={status} />
          </div>
          <ProgressBar spent={todaySpending} limit={dailyBudget} />
          <div className="flex justify-between text-xs text-text-secondary pt-2 border-t border-accent/5">
            <span>Batas: {formatCurrency(dailyBudget)}</span>
            <span>Sisa: {formatCurrency(Math.max(0, dailyBudget - todaySpending))}</span>
          </div>
        </div>

        {/* ── AI Insights Card ── */}
        <div className={`card-glass p-4 border space-y-3 ${
          mlStatus ? STATUS_BG[mlStatus.status] : 'border-accent/20'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-accent flex items-center gap-2">✨ AI Insights</h3>
            {mlStatus && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${STATUS_COLOR[mlStatus.status]} ${STATUS_BG[mlStatus.status]}`}>
                {STATUS_LABEL[mlStatus.status]} · {Math.round(mlStatus.confidence * 100)}%
              </span>
            )}
          </div>

          {mlLoading && (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-accent/10 rounded w-3/4" />
              <div className="h-3 bg-accent/10 rounded w-1/2" />
            </div>
          )}

          {!mlLoading && mlError && (
            <p className="text-xs text-text-secondary">
              ML API tidak tersedia. Pastikan uvicorn berjalan di port 8000.
            </p>
          )}

          {!mlLoading && !mlError && mlStatus && (
            <div className="space-y-2">
              {/* Status reason */}
              <p className="text-sm text-text-secondary">
                💡 {mlStatus.reason}
              </p>

              {/* Spending forecast */}
              {mlForecast && (
                <div className="pt-2 border-t border-accent/10 flex justify-between items-center">
                  <span className="text-xs text-text-secondary">Prediksi pengeluaran bulan depan:</span>
                  <span className="font-mono font-semibold text-accent text-sm">
                    {formatCurrency(mlForecast.predicted_amount)}
                  </span>
                </div>
              )}

              {/* Monthly summary context */}
              <div className="pt-1 flex justify-between items-center">
                <span className="text-xs text-text-secondary">Pengeluaran bulan ini:</span>
                <span className="font-mono text-xs font-semibold text-danger">
                  {formatCurrency(summary.total_expenses)}
                  {monthBudget > 0 && (
                    <span className="text-text-secondary font-normal">
                      {' '}/ {formatCurrency(monthBudget)}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {!mlLoading && !mlError && !mlStatus && transactions.length === 0 && (
            <p className="text-xs text-text-secondary">
              Tambahkan transaksi untuk mendapatkan analisis AI.
            </p>
          )}
        </div>

        {/* Monthly Summary */}
        <div className="card-glass p-4 space-y-3">
          <h3 className="font-semibold text-accent flex items-center gap-2">📊 Ringkasan Bulan Ini</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-text-secondary">Pendapatan</p>
              <p className="font-mono text-sm font-bold text-success">{formatCurrency(summary.total_income)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Pengeluaran</p>
              <p className="font-mono text-sm font-bold text-danger">{formatCurrency(summary.total_expenses)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Sisa</p>
              <p className={`font-mono text-sm font-bold ${summary.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Transactions */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">Transaksi Hari Ini</h2>
          {loading ? (
            <div className="card-solid p-8 text-center">
              <p className="text-text-secondary text-sm">Memuat...</p>
            </div>
          ) : todayTransactions.length > 0 ? (
            <div className="space-y-2">
              {todayTransactions.map(tx => (
                <TransactionCard
                  key={tx.id}
                  date={new Date(tx.date)}
                  category={tx.category}
                  categoryEmoji={tx.category_icon}
                  merchant={tx.note || tx.category}
                  amount={tx.amount}
                  type={tx.type}
                  account={tx.account}
                />
              ))}
            </div>
          ) : (
            <div className="card-solid p-8 text-center">
              <p className="text-text-secondary">Tidak ada transaksi hari ini</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-accent text-sm hover:underline"
              >
                + Tambah transaksi pertama
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-accent text-background rounded-full flex items-center justify-center font-bold text-2xl hover:bg-accent-dark transition-all shadow-glow z-40"
        aria-label="Tambah transaksi"
      >
        +
      </button>

      {showModal && (
        <AddTransactionModal
          session={session}
          onClose={() => setShowModal(false)}
          onAdded={fetchData}
        />
      )}
    </>
  )
}
