'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/mockData'
import type { UserSession } from '@/app/page'

const API_BASE = 'http://localhost:3001/api'

interface APITransaction {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  account: string
  date: string
}

interface BalanceViewProps {
  session: UserSession
}

export default function BalanceView({ session }: BalanceViewProps) {
  const [transactions, setTransactions] = useState<APITransaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch only this user's transactions to compute per-account balances
      const res = await fetch(`${API_BASE}/transactions?user_id=${session.userId}`)
      const json = await res.json()
      if (json.success) setTransactions(json.data)
    } catch { }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Compute balance per account from transaction history
  const accountBalances = transactions.reduce<Record<string, number>>((acc, t) => {
    if (!acc[t.account]) acc[t.account] = 0
    if (t.type === 'income')   acc[t.account] += t.amount
    if (t.type === 'expense')  acc[t.account] -= t.amount
    // transfers are neutral for balance purposes
    return acc
  }, {})

  const totalBalance = Object.values(accountBalances).reduce((s, b) => s + b, 0)

  // Current month summary
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyTx = transactions.filter(t => t.date.startsWith(currentMonth))
  const monthlyIncome   = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthlyExpenses = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const sortedAccounts = Object.entries(accountBalances).sort((a, b) => b[1] - a[1])

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Saldo Anda</h1>
        <p className="text-text-secondary text-sm">Ringkasan keuangan {session.userName}</p>
      </div>

      {/* Total balance card */}
      <div className="card-glass p-6 space-y-2 text-center">
        <p className="text-text-secondary text-sm">Total Saldo Bersih</p>
        <p className={`font-mono text-4xl font-bold ${totalBalance >= 0 ? 'gradient-text' : 'text-danger'}`}>
          {formatCurrency(totalBalance)}
        </p>
        <p className="text-text-secondary text-xs pt-2">Berdasarkan semua transaksi tercatat</p>
      </div>

      {/* Monthly snapshot */}
      <div className="card-solid p-5 space-y-3">
        <h3 className="font-semibold text-text-primary text-sm">Bulan Ini</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-text-secondary">Pendapatan</p>
            <p className="font-mono font-bold text-success">+{formatCurrency(monthlyIncome)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-text-secondary">Pengeluaran</p>
            <p className="font-mono font-bold text-danger">-{formatCurrency(monthlyExpenses)}</p>
          </div>
        </div>
        <div className="pt-2 border-t border-accent/5 flex justify-between items-center">
          <span className="text-text-secondary text-sm">Pendapatan bulanan (profil):</span>
          <span className="font-mono font-semibold text-accent">{formatCurrency(session.monthlyIncome)}</span>
        </div>
      </div>

      {/* Per-account balances */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-secondary text-sm">Saldo per Akun</h3>
        {loading ? (
          <p className="text-text-secondary text-sm text-center py-4">Memuat...</p>
        ) : sortedAccounts.length === 0 ? (
          <div className="card-solid p-6 text-center">
            <p className="text-text-secondary text-sm">Belum ada transaksi tercatat</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAccounts.map(([account, balance]) => (
              <div key={account} className="card-solid p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {account.toLowerCase().includes('bca') || account.toLowerCase().includes('bank') ? '🏦'
                      : account.toLowerCase().includes('gopay') || account.toLowerCase().includes('ovo') || account.toLowerCase().includes('dana') ? '📱'
                      : account.toLowerCase().includes('credit') || account.toLowerCase().includes('kartu') ? '💳'
                      : account.toLowerCase().includes('tunai') || account.toLowerCase().includes('cash') ? '💵'
                      : '💰'}
                  </span>
                  <div>
                    <p className="text-text-primary font-medium">{account}</p>
                    <p className="text-text-secondary text-xs">
                      {transactions.filter(t => t.account === account).length} transaksi
                    </p>
                  </div>
                </div>
                <span className={`font-mono font-semibold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(balance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
