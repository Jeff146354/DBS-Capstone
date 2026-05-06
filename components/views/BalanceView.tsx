'use client'

import { useMemo } from 'react'
import { mockAccounts, getTotalBalance, formatCurrency } from '@/lib/mockData'

export default function BalanceView() {
  const totalBalance = useMemo(() => getTotalBalance(mockAccounts), [])
  
  const paymentAccounts = mockAccounts.filter(a => a.type === 'payment')
  const creditCards = mockAccounts.filter(a => a.type === 'credit')
  const savings = mockAccounts.filter(a => a.type === 'savings')

  const AccountSection = ({ title, accounts }: { title: string; accounts: typeof mockAccounts }) => (
    <div className="space-y-3">
      <h3 className="font-semibold text-text-secondary text-sm">{title}</h3>
      <div className="space-y-2">
        {accounts.map((account) => (
          <div key={account.id} className="card-solid p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{account.icon}</span>
              <div>
                <p className="text-text-primary font-medium">{account.name}</p>
                <p className="text-text-secondary text-xs">{account.type}</p>
              </div>
            </div>
            <div className={`font-mono font-semibold ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(account.balance)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Saldo Anda</h1>
        <p className="text-text-secondary text-sm">Total aset dan liabilitas</p>
      </div>

      {/* Total Balance Card */}
      <div className="card-glass p-6 space-y-2 text-center">
        <p className="text-text-secondary text-sm">Total Saldo</p>
        <p className="font-mono text-4xl font-bold gradient-text">{formatCurrency(totalBalance)}</p>
        <p className="text-text-secondary text-xs pt-2">Termasuk semua akun dan kartu kredit</p>
      </div>

      {/* Account Sections */}
      <div className="space-y-8">
        {paymentAccounts.length > 0 && <AccountSection title="Dompet Digital" accounts={paymentAccounts} />}
        {savings.length > 0 && <AccountSection title="Tabungan & Investasi" accounts={savings} />}
        {creditCards.length > 0 && <AccountSection title="Kartu Kredit" accounts={creditCards} />}
      </div>
    </div>
  )
}
