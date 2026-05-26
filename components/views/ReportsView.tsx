'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/mockData'
import type { UserSession } from '@/app/page'

import { API_BASE } from '@/lib/config'

const CHART_COLORS = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#FFB3BA', '#A0E7E5', '#7FD8BE', '#4D96FF', '#6BCB77']

interface APITransaction {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category: string
  category_icon: string
  date: string
}

interface ReportsViewProps {
  session: UserSession
}

export default function ReportsView({ session }: ReportsViewProps) {
  const [transactions, setTransactions] = useState<APITransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/transactions?user_id=${session.userId}&month=${selectedMonth}`)
      const json = await res.json()
      if (json.success) setTransactions(json.data)
    } catch { }
    finally { setLoading(false) }
  }, [selectedMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const expenses = transactions.filter(t => t.type === 'expense')
  const incomes  = transactions.filter(t => t.type === 'income')

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome   = incomes.reduce((s, t) => s + t.amount, 0)
  const balance       = totalIncome - totalExpenses

  // Group expenses by category for pie chart
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; icon: string; amount: number }> = {}
    expenses.forEach(t => {
      if (!map[t.category]) map[t.category] = { name: t.category, icon: t.category_icon, amount: 0 }
      map[t.category].amount += t.amount
    })
    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))
  }, [expenses, totalExpenses])

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Laporan</h1>
        <p className="text-text-secondary text-sm">Analisis pengeluaran Anda</p>
      </div>

      {/* Month picker */}
      <div className="card-solid p-3 flex items-center gap-3">
        <span className="text-text-secondary text-xs">Bulan:</span>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 bg-bg-tertiary px-3 py-2 rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {loading ? (
        <div className="card-solid p-8 text-center">
          <p className="text-text-secondary text-sm">Memuat...</p>
        </div>
      ) : (
        <>
          {/* Donut chart */}
          {categoryData.length > 0 ? (
            <div className="card-glass p-6 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8 }}
                    labelStyle={{ color: '#a0aec0' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center space-y-1">
                <p className="text-text-secondary text-sm">Total Pengeluaran</p>
                <p className="font-mono text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          ) : (
            <div className="card-solid p-8 text-center">
              <p className="text-text-secondary">Belum ada pengeluaran bulan ini</p>
            </div>
          )}

          {/* Category breakdown */}
          {categoryData.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-text-secondary text-sm">Perincian Kategori</h3>
              <div className="space-y-2">
                {categoryData.map((cat, i) => (
                  <div key={cat.name} className="card-solid p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-text-primary font-medium">{cat.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-danger">{formatCurrency(cat.amount)}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-full bg-bg-tertiary rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${cat.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                    <p className="text-xs text-text-secondary mt-1 text-right">{cat.percentage}% dari total</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <div className="flex justify-between items-center pb-3 border-b border-accent/5">
              <span className="text-text-secondary">Rata-rata per hari:</span>
              <span className="font-mono font-semibold text-text-primary">
                {formatCurrency(Math.round(totalExpenses / new Date(selectedMonth + '-01').toLocaleDateString('en', { day: 'numeric', month: 'numeric', year: 'numeric' }).split('/')[0].length || 30))}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-text-primary font-semibold">Surplus / Defisit:</span>
              <span className={`font-mono font-bold text-xl ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
