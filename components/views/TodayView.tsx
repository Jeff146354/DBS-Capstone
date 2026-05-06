'use client'

import { useMemo } from 'react'
import { mockTransactions, getTodaySpending, formatCurrency, getGreeting, getSpendingStatus } from '@/lib/mockData'
import TransactionCard from '@/components/TransactionCard'
import StatusBadge from '@/components/StatusBadge'
import ProgressBar from '@/components/ProgressBar'

export default function TodayView() {
  const dailyLimit = 200000
  const todaySpending = getTodaySpending(mockTransactions)
  const status = getSpendingStatus(todaySpending, dailyLimit)
  const greeting = getGreeting()
  
  const todayTransactions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return mockTransactions
      .filter(t => {
        const txDate = new Date(t.date)
        txDate.setHours(0, 0, 0, 0)
        return txDate.getTime() === today.getTime()
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [])

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-text-secondary text-sm">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <h1 className="text-2xl font-bold text-text-primary">Selamat {greeting}, Raihanah 👋</h1>
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
        
        <ProgressBar spent={todaySpending} limit={dailyLimit} />
        
        <div className="flex justify-between text-xs text-text-secondary pt-2 border-t border-accent/5">
          <span>Batas: {formatCurrency(dailyLimit)}</span>
          <span>Sisa: {formatCurrency(Math.max(0, dailyLimit - todaySpending))}</span>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="card-glass p-4 border-accent/20 space-y-3">
        <h3 className="font-semibold text-accent flex items-center gap-2">✨ AI Insights</h3>
        <p className="text-sm text-text-secondary">Prediksi pengeluaran bulan ini: <span className="text-accent font-semibold">Rp 4,200,000</span></p>
        <p className="text-xs text-text-secondary">💡 Anda menghabiskan 40% lebih banyak untuk Cafe minggu ini dibanding minggu lalu. Pertimbangkan untuk menetapkan batas harian untuk cafe.</p>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Transaksi Hari Ini</h2>
        {todayTransactions.length > 0 ? (
          <div className="space-y-2">
            {todayTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                date={tx.date}
                category={tx.category}
                categoryEmoji={tx.categoryEmoji}
                merchant={tx.merchant}
                amount={tx.amount}
                type={tx.type}
                account={tx.account}
              />
            ))}
          </div>
        ) : (
          <div className="card-solid p-8 text-center">
            <p className="text-text-secondary">Tidak ada transaksi hari ini</p>
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      <button className="fixed bottom-24 right-4 w-14 h-14 bg-accent text-background rounded-full flex items-center justify-center font-bold text-xl hover:bg-accent-dark transition-all shadow-glow hover:shadow-glow">
        +
      </button>
    </div>
  )
}
