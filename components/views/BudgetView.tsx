'use client'

import { useState, useMemo } from 'react'
import { mockBudgets, formatCurrency, getMonthlySpending, getTotalIncome } from '@/lib/mockData'
import ProgressBar from '@/components/ProgressBar'

export default function BudgetView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const monthlySpending = useMemo(() => getMonthlySpending([]), [])
  const monthlyIncome = useMemo(() => getTotalIncome([]), [])

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthString = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Anggaran</h1>
        <p className="text-text-secondary text-sm">Pantau pengeluaran vs anggaran</p>
      </div>

      {/* Month Selector */}
      <div className="card-solid p-4 flex items-center justify-between">
        <button onClick={handlePreviousMonth} className="text-accent hover:text-accent-dark text-xl">←</button>
        <span className="font-semibold text-text-primary capitalize">{monthString}</span>
        <button onClick={handleNextMonth} className="text-accent hover:text-accent-dark text-xl">→</button>
      </div>

      {/* Budget Categories Grid */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-secondary text-sm">Kategori Pengeluaran</h3>
        <div className="grid grid-cols-2 gap-3">
          {mockBudgets.map((budget) => (
            <div key={budget.category} className="card-solid p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{budget.categoryEmoji}</span>
                <span className="text-sm font-medium text-text-primary">{budget.category}</span>
              </div>
              <ProgressBar spent={budget.spent} limit={budget.limit} showLabel={false} />
              <div className="flex justify-between text-xs text-text-secondary mt-2">
                <span>{formatCurrency(budget.spent)}</span>
                <span>{formatCurrency(budget.limit)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Income Section */}
      <div className="card-glass p-5 space-y-4">
        <h3 className="font-semibold text-text-primary">Pendapatan</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💼</span>
              <span className="text-text-primary">Gaji</span>
            </div>
            <span className="font-mono font-semibold text-success">+Rp 5.000.000</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📈</span>
              <span className="text-text-primary">Freelance</span>
            </div>
            <span className="font-mono font-semibold text-success">+Rp 500.000</span>
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="card-solid p-5 space-y-3 border border-accent/10">
        <div className="flex justify-between items-center pb-3 border-b border-accent/5">
          <span className="text-text-secondary">Total Pendapatan:</span>
          <span className="font-mono font-semibold text-success">+Rp 5.500.000</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-accent/5">
          <span className="text-text-secondary">Total Pengeluaran:</span>
          <span className="font-mono font-semibold text-danger">-Rp 4.194.000</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-text-primary font-semibold">Sisa Bulan Ini:</span>
          <span className="font-mono font-bold text-xl text-success">+Rp 1.306.000</span>
        </div>
      </div>
    </div>
  )
}
