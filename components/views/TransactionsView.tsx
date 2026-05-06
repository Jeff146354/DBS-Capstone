'use client'

import { useMemo } from 'react'
import { mockTransactions, formatCurrency } from '@/lib/mockData'
import TransactionCard from '@/components/TransactionCard'

export default function TransactionsView() {
  const groupedTransactions = useMemo(() => {
    const grouped: {
      expenses: typeof mockTransactions;
      income: typeof mockTransactions;
      transfers: typeof mockTransactions;
    } = {
      expenses: [],
      income: [],
      transfers: []
    }

    mockTransactions.forEach(tx => {
      if (tx.type === 'expense') grouped.expenses.push(tx)
      else if (tx.type === 'income') grouped.income.push(tx)
      else grouped.transfers.push(tx)
    })

    // Sort each group by date descending
    grouped.expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    grouped.income.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    grouped.transfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return grouped
  }, [])

  const calculateGroupTotal = (transactions: typeof mockTransactions) => {
    return transactions.reduce((sum, tx) => sum + tx.amount, 0)
  }

  const TransactionGroup = ({ 
    title, 
    transactions, 
    type 
  }: { 
    title: string
    transactions: typeof mockTransactions
    type: 'expense' | 'income' | 'transfer'
  }) => {
    if (transactions.length === 0) return null

    const total = calculateGroupTotal(transactions)
    const totalColor = type === 'income' ? 'text-success' : type === 'expense' ? 'text-danger' : 'text-accent'

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-text-secondary text-sm">{title}</h3>
        <div className="space-y-2">
          {transactions.map(tx => (
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
        <div className="card-solid p-3 flex justify-between bg-bg-tertiary">
          <span className="text-text-secondary text-sm">Total {title}:</span>
          <span className={`font-mono font-semibold text-sm ${totalColor}`}>
            {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Transaksi</h1>
        <p className="text-text-secondary text-sm">Riwayat semua transaksi</p>
      </div>

      {/* Filter Controls */}
      <div className="card-solid p-3 flex gap-2">
        <button className="flex-1 px-3 py-2 bg-accent text-background rounded-lg text-xs font-semibold hover:bg-accent-dark transition-colors">
          Semua
        </button>
        <button className="flex-1 px-3 py-2 bg-bg-tertiary text-text-primary rounded-lg text-xs font-semibold hover:bg-accent/10 transition-colors">
          Pengeluaran
        </button>
        <button className="flex-1 px-3 py-2 bg-bg-tertiary text-text-primary rounded-lg text-xs font-semibold hover:bg-accent/10 transition-colors">
          Pendapatan
        </button>
      </div>

      {/* Transaction Groups */}
      <div className="space-y-8">
        <TransactionGroup 
          title="Pengeluaran" 
          transactions={groupedTransactions.expenses}
          type="expense"
        />
        <TransactionGroup 
          title="Pendapatan" 
          transactions={groupedTransactions.income}
          type="income"
        />
        <TransactionGroup 
          title="Transfer" 
          transactions={groupedTransactions.transfers}
          type="transfer"
        />
      </div>
    </div>
  )
}
