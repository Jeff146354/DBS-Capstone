'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts'
import { mockExpenseCategories, formatCurrency } from '@/lib/mockData'

export default function ReportsView() {
  const [dateRange, setDateRange] = useState('current')
  
  const totalExpense = mockExpenseCategories.reduce((sum, cat) => sum + cat.amount, 0)
  const profit = 1306000
  
  const chartColors = [
    '#FF6B6B', '#4ECDC4', '#95E1D3', '#FFB3BA', '#FFFFBA', '#A0E7E5', '#7FD8BE'
  ]

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Laporan</h1>
        <p className="text-text-secondary text-sm">Analisis pengeluaran Anda</p>
      </div>

      {/* Date Range Selector */}
      <div className="card-solid p-4 flex gap-2">
        <input type="date" className="flex-1 bg-bg-tertiary px-3 py-2 rounded-lg text-text-primary text-sm" defaultValue="2025-01-01" />
        <span className="text-text-secondary self-center">→</span>
        <input type="date" className="flex-1 bg-bg-tertiary px-3 py-2 rounded-lg text-text-primary text-sm" defaultValue="2025-01-31" />
      </div>

      {/* Donut Chart */}
      <div className="card-glass p-6 flex flex-col items-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={mockExpenseCategories}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="amount"
            >
              {mockExpenseCategories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-4 space-y-1">
          <p className="text-text-secondary text-sm">Surplus Bulan Ini</p>
          <p className="font-mono text-2xl font-bold text-success">+{formatCurrency(profit)}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-secondary text-sm">Perincian Kategori</h3>
        <div className="space-y-2">
          {mockExpenseCategories.map((category, index) => (
            <div key={category.name} className="card-solid p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  <span className="text-text-primary font-medium">{category.name}</span>
                </div>
                <span className="font-mono font-semibold text-danger">{formatCurrency(category.amount)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span></span>
                <span>{category.percentage}% dari total</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Summary */}
      <div className="card-solid p-5 space-y-2 border border-accent/10">
        <div className="flex justify-between items-center pb-2 border-b border-accent/5">
          <span className="text-text-secondary">Total Pengeluaran:</span>
          <span className="font-mono font-semibold text-danger">{formatCurrency(totalExpense)}</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-text-secondary">Rata-rata per hari:</span>
          <span className="font-mono font-semibold text-text-primary">{formatCurrency(Math.round(totalExpense / 31))}</span>
        </div>
      </div>
    </div>
  )
}
