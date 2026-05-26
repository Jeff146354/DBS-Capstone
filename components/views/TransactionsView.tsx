'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency } from '@/lib/mockData'
import TransactionCard from '@/components/TransactionCard'
import AddTransactionModal from '@/components/AddTransactionModal'
import type { UserSession } from '@/app/page'

import { API_BASE } from '@/lib/config'

interface APITransaction {
  id: string
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category: string
  category_icon: string
  account: string
  payment_method: string
  note?: string
  date: string
}

type FilterType = 'all' | 'expense' | 'income'

interface TransactionsViewProps {
  session: UserSession
}

export default function TransactionsView({ session }: TransactionsViewProps) {
  const [transactions, setTransactions] = useState<APITransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/transactions?user_id=${session.userId}&month=${selectedMonth}`)
      const json = await res.json()
      if (json.success) setTransactions(json.data)
    } catch { }
    finally { setLoading(false) }
  }, [selectedMonth])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const filtered = useMemo(() =>
    filter === 'all' ? transactions : transactions.filter(t => t.type === filter),
    [transactions, filter]
  )

  const total = useMemo(() => filtered.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0), [filtered])

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'expense', label: 'Pengeluaran' },
    { key: 'income', label: 'Pendapatan' },
  ]

  return (
    <>
      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">Transaksi</h1>
          <p className="text-text-secondary text-sm">Riwayat semua transaksi</p>
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

        {/* Filter tabs */}
        <div className="card-solid p-1 flex rounded-xl gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key ? 'bg-accent text-background' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="card-solid p-3 flex justify-between items-center">
            <span className="text-text-secondary text-sm">{filtered.length} transaksi</span>
            <span className={`font-mono font-semibold text-sm ${total >= 0 ? 'text-success' : 'text-danger'}`}>
              {total >= 0 ? '+' : ''}{formatCurrency(total)}
            </span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="card-solid p-8 text-center">
            <p className="text-text-secondary text-sm">Memuat...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-solid p-8 text-center space-y-2">
            <p className="text-text-secondary">Tidak ada transaksi</p>
            <button onClick={() => setShowModal(true)} className="text-accent text-sm hover:underline">
              + Tambah transaksi
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => (
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
        )}
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
          onAdded={fetchTransactions}
        />
      )}
    </>
  )
}
