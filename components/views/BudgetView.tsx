'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/mockData'
import ProgressBar from '@/components/ProgressBar'
import type { UserSession } from '@/app/page'

import { API_BASE } from '@/lib/config'

interface APITransaction {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category: string
  category_icon: string
}

interface BudgetViewProps {
  session: UserSession
}

export default function BudgetView({ session }: BudgetViewProps) {
  const [transactions, setTransactions] = useState<APITransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/transactions?user_id=${session.userId}&month=${monthStr}`)
      const json = await res.json()
      if (json.success) setTransactions(json.data)
    } catch { }
    finally { setLoading(false) }
  }, [monthStr])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePrev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const handleNext = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  const monthLabel = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  // Aggregate spending per category
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce<Record<string, { icon: string; spent: number }>>((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { icon: t.category_icon, spent: 0 }
      acc[t.category].spent += t.amount
      return acc
    }, {})

  const totalExpenses = Object.values(expenseByCategory).reduce((s, c) => s + c.spent, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpenses

  // Use monthly_income as the overall budget reference
  const monthlyBudget = session.monthlyIncome || totalIncome || 1

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Anggaran</h1>
        <p className="text-text-secondary text-sm">Pantau pengeluaran vs anggaran</p>
      </div>

      {/* Month selector */}
      <div className="card-solid p-4 flex items-center justify-between">
        <button onClick={handlePrev} className="text-accent hover:text-accent-dark text-xl px-2">←</button>
        <span className="font-semibold text-text-primary capitalize">{monthLabel}</span>
        <button onClick={handleNext} className="text-accent hover:text-accent-dark text-xl px-2">→</button>
      </div>

      {/* Overall budget progress */}
      <div className="card-glass p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary text-sm">Total Pengeluaran</span>
          <span className="font-mono font-bold text-danger">{formatCurrency(totalExpenses)}</span>
        </div>
        <ProgressBar spent={totalExpenses} limit={monthlyBudget} />
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Anggaran: {formatCurrency(monthlyBudget)}</span>
          <span>{monthlyBudget > 0 ? Math.round((totalExpenses / monthlyBudget) * 100) : 0}% terpakai</span>
        </div>
      </div>

      {/* Per-category breakdown */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-secondary text-sm">Pengeluaran per Kategori</h3>
        {loading ? (
          <p className="text-text-secondary text-sm text-center py-4">Memuat...</p>
        ) : Object.keys(expenseByCategory).length === 0 ? (
          <div className="card-solid p-6 text-center">
            <p className="text-text-secondary text-sm">Belum ada pengeluaran bulan ini</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(expenseByCategory)
              .sort((a, b) => b[1].spent - a[1].spent)
              .map(([cat, data]) => {
                const catBudget = Math.round(monthlyBudget / Object.keys(expenseByCategory).length)
                return (
                  <div key={cat} className="card-solid p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{data.icon}</span>
                      <span className="text-sm font-medium text-text-primary truncate">{cat}</span>
                    </div>
                    <ProgressBar spent={data.spent} limit={catBudget} showLabel={false} />
                    <div className="flex justify-between text-xs text-text-secondary mt-2">
                      <span>{formatCurrency(data.spent)}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="card-solid p-5 space-y-3 border border-accent/10">
        <div className="flex justify-between items-center pb-3 border-b border-accent/5">
          <span className="text-text-secondary">Total Pendapatan:</span>
          <span className="font-mono font-semibold text-success">+{formatCurrency(totalIncome)}</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-accent/5">
          <span className="text-text-secondary">Total Pengeluaran:</span>
          <span className="font-mono font-semibold text-danger">-{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-text-primary font-semibold">Sisa Bulan Ini:</span>
          <span className={`font-mono font-bold text-xl ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}
