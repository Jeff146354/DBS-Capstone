'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency, getGreeting, getSpendingStatus } from '@/lib/mockData'
import TransactionCard from '@/components/TransactionCard'
import StatusBadge from '@/components/StatusBadge'
import ProgressBar from '@/components/ProgressBar'
import AddTransactionModal from '@/components/AddTransactionModal'
import type { UserSession } from '@/app/page'
import type { TransactionFeatures } from '@/lib/api'
import { API_BASE, ML_BASE } from '@/lib/config'

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
  date: string
}

interface MLStatus {
  status: 'AMAN' | 'HATI-HATI' | 'BOROS'
  confidence: number
  reason: string
  detail?: string
}

interface MLForecast {
  predicted_amount: number
  currency: string
  month: string
  detail?: string
}

interface TodayViewProps {
  session: UserSession
}

// ─── Feature engineering ────────────────────────────────────────────────────

function buildFeatures(
  targetDate: string,
  allMonthTx: APITransaction[],
  monthBudget: number,
): TransactionFeatures {
  // daily_budget is only used as an ML feature, not shown in UI
  const dailyBudget = monthBudget > 0 ? Math.round(monthBudget / 30) : 200000

  const expenses = allMonthTx.filter(t => t.type === 'expense')
  const dayExpenses = expenses.filter(t => t.date === targetDate)
  const cumExpenseDaily = dayExpenses.reduce((s, t) => s + t.amount, 0)
  const cumExpenseMonthly = expenses.filter(t => t.date <= targetDate).reduce((s, t) => s + t.amount, 0)
  const currentBudget = monthBudget - cumExpenseMonthly
  const spendingRatio = monthBudget > 0 ? cumExpenseMonthly / monthBudget : 0
  const trxFrequency = allMonthTx.filter(t => t.date === targetDate).length

  const rollingAvg7d = (() => {
    let total = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(targetDate)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      total += expenses.filter(t => t.date === ds).reduce((s, t) => s + t.amount, 0)
    }
    return total / 7
  })()

  const yesterday = (() => {
    const d = new Date(targetDate); d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()
  const yesterdayTotal = expenses.filter(t => t.date === yesterday).reduce((s, t) => s + t.amount, 0)

  // Monthly aggregate features (new in v2)
  const monthlyAmounts = expenses.map(t => t.amount)
  const avgDailyExpense = monthlyAmounts.length > 0
    ? monthlyAmounts.reduce((s, a) => s + a, 0) / monthlyAmounts.length : 0
  const totalTrxMonth = expenses.length
  const maxSingleTrx = monthlyAmounts.length > 0 ? Math.max(...monthlyAmounts) : 0
  const stdDailyExpense = (() => {
    if (monthlyAmounts.length < 2) return 0
    const mean = avgDailyExpense
    const variance = monthlyAmounts.reduce((s, a) => s + (a - mean) ** 2, 0) / monthlyAmounts.length
    return Math.sqrt(variance)
  })()

  return {
    amount: dayExpenses.length > 0 ? cumExpenseDaily / dayExpenses.length : 0,
    week_of_month: Math.ceil(new Date(targetDate).getDate() / 7),
    day_of_month: new Date(targetDate).getDate(),
    month_budget: monthBudget,
    daily_budget: dailyBudget,
    cum_expense_daily: cumExpenseDaily,
    cum_expense_monthly: cumExpenseMonthly,
    current_budget: currentBudget,
    spending_ratio: spendingRatio,
    trx_frequency: trxFrequency,
    rolling_avg_7d: rollingAvg7d,
    expense_acceleration: cumExpenseDaily - yesterdayTotal,
    avg_daily_expense: avgDailyExpense,
    total_trx_month: totalTrxMonth,
    max_single_trx: maxSingleTrx,
    std_daily_expense: stdDailyExpense,
  }
}

function buildSequence(
  targetDate: string,
  allMonthTx: APITransaction[],
  monthBudget: number,
): TransactionFeatures[] {
  // Window = 14 days (changed from 7 in v2)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(targetDate)
    d.setDate(d.getDate() - (13 - i))
    return buildFeatures(d.toISOString().split('T')[0], allMonthTx, monthBudget)
  })
}

// ─── Status styling ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = { AMAN: 'Aman', 'HATI-HATI': 'Hati-hati', BOROS: 'Boros' }
const STATUS_COLOR: Record<string, string> = { AMAN: 'text-success', 'HATI-HATI': 'text-warning', BOROS: 'text-danger' }
const STATUS_BG: Record<string, string> = {
  AMAN: 'insight-aman',
  'HATI-HATI': 'insight-hati-hati',
  BOROS: 'insight-boros',
}

// ─── Simple markdown renderer ────────────────────────────────────────────────

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <p key={i} className="font-bold text-accent text-sm mt-3 mb-1">{line.slice(3)}</p>
    if (/^\d+\.\s\*\*(.+?)\*\*:(.*)/.test(line)) {
      const m = line.match(/^\d+\.\s\*\*(.+?)\*\*:(.*)/)!
      return <p key={i} className="text-xs text-text-secondary ml-2">• <span className="font-semibold text-text-primary">{m[1]}:</span>{m[2]}</p>
    }
    if (line.trim() === '') return null
    return <p key={i} className="text-xs text-text-secondary leading-relaxed">{line}</p>
  })
}

// ─── Error box ───────────────────────────────────────────────────────────────

function ErrorBox({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
      <p className="text-xs text-danger font-mono">⚠ {label}</p>
      <p className="text-xs text-danger/70 font-mono mt-1 break-all">{detail}</p>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TodayView({ session }: TodayViewProps) {
  const [transactions, setTransactions] = useState<APITransaction[]>([])
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)

  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null)
  const [mlForecast, setMlForecast] = useState<MLForecast | null>(null)
  const [mlInsight, setMlInsight] = useState<string | null>(null)
  const [mlLoading, setMlLoading] = useState(false)
  const [mlErrors, setMlErrors] = useState<Record<string, string>>({})
  const [mlRetryCount, setMlRetryCount] = useState(0)

  const mlFetchedRef = useRef(false)

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)
  const monthBudget = session.monthlyIncome

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/transactions?user_id=${session.userId}&month=${currentMonth}`),
        fetch(`${API_BASE}/summary/${session.userId}`),
      ])
      if (!txRes.ok) throw new Error(`Transactions API: ${txRes.status} ${txRes.statusText}`)
      if (!sumRes.ok) throw new Error(`Summary API: ${sumRes.status} ${sumRes.statusText}`)
      const [txJson, sumJson] = await Promise.all([txRes.json(), sumRes.json()])
      if (!txJson.success) throw new Error(`Transactions: ${txJson.error}`)
      if (!sumJson.success) throw new Error(`Summary: ${sumJson.error}`)
      setTransactions(txJson.data)
      setSummary(sumJson.data)
    } catch (err) {
      setLoadError(String(err))
    } finally {
      setLoading(false)
    }
  }, [session.userId, currentMonth])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (loading || transactions.length === 0) return
    if (mlFetchedRef.current) return
    mlFetchedRef.current = true

    async function fetchML() {
      setMlLoading(true)
      setMlErrors({})
      const errors: Record<string, string> = {}

      const features = buildFeatures(today, transactions, monthBudget)
      const sequence = buildSequence(today, transactions, monthBudget)

      // ── Status prediction ──
      let statusData: MLStatus | null = null
      try {
        const res = await fetch(`${ML_BASE}/predict/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(features),
        })
        const json = await res.json()
        if (!res.ok) errors.status = `${res.status}: ${json.detail ?? JSON.stringify(json)}`
        else statusData = json
      } catch (err) {
        errors.status = `Network error: ${err}`
      }
      setMlStatus(statusData)

      // ── Spending forecast ──
      let forecastData: MLForecast | null = null
      try {
        const res = await fetch(`${ML_BASE}/predict/spending`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence }),
        })
        const json = await res.json()
        if (!res.ok) errors.forecast = `${res.status}: ${json.detail ?? JSON.stringify(json)}`
        else forecastData = json
      } catch (err) {
        errors.forecast = `Network error: ${err}`
      }
      setMlForecast(forecastData)

      // ── AI insights (only if status + forecast succeeded) ──
      if (statusData && forecastData) {
        try {
          const predRatio = monthBudget > 0 ? forecastData.predicted_amount / monthBudget : 0
          const sisaBudget = monthBudget - forecastData.predicted_amount

          const insightPayload = {
            user_name: session.userName,
            month_budget: monthBudget,
            cum_monthly: features.cum_expense_monthly,
            current_budget_rem: features.current_budget,
            spending_ratio_now: features.spending_ratio,
            label: statusData.status,
            confidence: statusData.confidence,
            prob_aman: 0,
            prob_hati_hati: 0,
            prob_boros: 0,
            pred_rupiah: forecastData.predicted_amount,
            pred_ratio: predRatio,
            sisa_budget: sisaBudget,
          }
          if (statusData.status === 'AMAN') insightPayload.prob_aman = statusData.confidence
          else if (statusData.status === 'HATI-HATI') insightPayload.prob_hati_hati = statusData.confidence
          else insightPayload.prob_boros = statusData.confidence

          const res = await fetch(`${ML_BASE}/predict/insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(insightPayload),
          })
          const json = await res.json()
          if (!res.ok) errors.insights = `${res.status}: ${json.detail ?? JSON.stringify(json)}`
          else setMlInsight(json.insight)
        } catch (err) {
          errors.insights = `Network error: ${err}`
        }
      }

      setMlErrors(errors)
      setMlLoading(false)
    }

    fetchML()
  }, [loading, transactions.length, today, monthBudget, session.userName, mlRetryCount])

  const todayTransactions = transactions.filter(t => t.date === today)
  const monthlyExpenses = summary.total_expenses
  const monthlyStatus = getSpendingStatus(monthlyExpenses, monthBudget)
  const greeting = getGreeting()

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        alert(`Gagal menghapus: ${json.error ?? res.statusText}`)
        return
      }
      mlFetchedRef.current = false
      setMlStatus(null)
      setMlForecast(null)
      setMlInsight(null)
      setMlErrors({})
      fetchData()
    } catch (err) {
      alert(`Gagal menghapus: ${err}`)
    }
  }

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

        {/* Data load error */}
        {loadError && <ErrorBox label="Gagal memuat data" detail={loadError} />}

        {/* Monthly Spending Card */}
        <div className="card-glass p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-text-secondary text-sm mb-1">Pengeluaran Bulan Ini</p>
              <p className="font-mono text-2xl font-bold text-accent">{formatCurrency(monthlyExpenses)}</p>
            </div>
            <StatusBadge status={monthlyStatus} />
          </div>
          <ProgressBar spent={monthlyExpenses} limit={monthBudget} />
          <div className="flex justify-between text-xs text-text-secondary pt-2 border-t border-accent/5">
            <span>Budget: {formatCurrency(monthBudget)}</span>
            <span>Sisa: {formatCurrency(Math.max(0, monthBudget - monthlyExpenses))}</span>
          </div>
        </div>

        {/* AI Insights Card */}
        <div className={`card-glass p-4 border space-y-3 ${mlStatus ? STATUS_BG[mlStatus.status] : 'border-accent/20'}`}>
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
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-3 bg-accent/10 rounded ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
              ))}
            </div>
          )}

          {!mlLoading && Object.entries(mlErrors).map(([key, msg]) => (
            <ErrorBox key={key} label={`ML ${key} error`} detail={msg} />
          ))}
          {!mlLoading && Object.keys(mlErrors).length > 0 && (
            <button
              onClick={() => {
                mlFetchedRef.current = false
                setMlErrors({})
                setMlStatus(null)
                setMlForecast(null)
                setMlInsight(null)
                setMlRetryCount(c => c + 1)
              }}
              className="text-xs text-accent hover:underline mt-1"
            >
              ↻ Coba lagi
            </button>
          )}

          {!mlLoading && mlInsight && (
            <div className="space-y-1 pt-1">
              {renderMarkdown(mlInsight)}
            </div>
          )}

          {!mlLoading && mlForecast && !mlInsight && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-text-secondary">Prediksi pengeluaran bulan depan:</span>
              <span className="font-mono font-semibold text-accent text-sm">
                {formatCurrency(mlForecast.predicted_amount)}
              </span>
            </div>
          )}

          {!mlLoading && transactions.length === 0 && Object.keys(mlErrors).length === 0 && (
            <p className="text-xs text-text-secondary">Tambahkan transaksi untuk mendapatkan analisis AI.</p>
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
                  id={tx.id}
                  date={new Date(tx.date)}
                  category={tx.category}
                  categoryEmoji={tx.category_icon}
                  merchant={tx.note || tx.category}
                  amount={tx.amount}
                  type={tx.type}
                  account={tx.account}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="card-solid p-8 text-center">
              <p className="text-text-secondary">Tidak ada transaksi hari ini</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-accent text-sm hover:underline">
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
