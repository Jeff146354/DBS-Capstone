'use client'

import { useState, useEffect } from 'react'
import type { UserSession } from '@/app/page'
import { formatCurrency } from '@/lib/mockData'

const API_BASE = 'http://localhost:3001/api'

interface Category {
  id: string
  name: string
  icon: string
  type: 'expense' | 'income'
}

interface AddTransactionModalProps {
  session: UserSession
  onClose: () => void
  onAdded: () => void
}

export default function AddTransactionModal({ session, onClose, onAdded }: AddTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [account, setAccount] = useState('GoPay')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'e-wallet' | 'credit'>('e-wallet')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setCategories(j.data)
      })
      .catch(() => {})
  }, [])

  const filteredCategories = categories.filter(c => c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !category) {
      setError('Jumlah dan kategori wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.userId,
          type,
          amount: Number(amount),
          category,
          account,
          payment_method: paymentMethod,
          note: note || undefined,
          date,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Gagal menyimpan transaksi.')
        return
      }
      onAdded()
      onClose()
    } catch {
      setError('Tidak dapat terhubung ke server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-bg-secondary rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-accent/30 rounded-full mx-auto" />

        <h2 className="text-lg font-bold text-text-primary text-center">Tambah Transaksi</h2>

        {/* Type toggle */}
        <div className="card-solid p-1 flex rounded-xl">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                type === t ? 'bg-accent text-background' : 'text-text-secondary'
              }`}
            >
              {t === 'expense' ? 'Pengeluaran' : 'Pendapatan'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Jumlah (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="50000"
              min="1"
              className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
            />
            {amount && <p className="text-xs text-accent">{formatCurrency(Number(amount))}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Kategori</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
            >
              <option value="">Pilih kategori...</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Account */}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Akun</label>
            <input
              type="text"
              value={account}
              onChange={e => setAccount(e.target.value)}
              placeholder="GoPay, BCA, Tunai..."
              className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
            />
          </div>

          {/* Payment method */}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Metode Pembayaran</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="e-wallet">E-Wallet</option>
              <option value="cash">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="credit">Kartu Kredit</option>
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
            />
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Catatan (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Keterangan transaksi..."
              className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-accent/20 text-text-secondary text-sm font-semibold hover:bg-bg-tertiary transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-accent text-background text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
