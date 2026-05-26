'use client'

import { useState } from 'react'
import type { UserSession } from '@/app/page'

const API_BASE = 'http://localhost:3001/api'

interface LoginScreenProps {
  onLogin: (session: UserSession) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login state
  const [loginName, setLoginName] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regIncome, setRegIncome] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginName.trim()) return
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch(`${API_BASE}/users?name=${encodeURIComponent(loginName.trim())}`)
      const json = await res.json()
      if (!json.success || !json.data) {
        setLoginError('Pengguna tidak ditemukan. Coba daftar terlebih dahulu.')
        return
      }
      const user = json.data
      onLogin({ userId: user.id, userName: user.name, monthlyIncome: user.monthly_income })
    } catch {
      setLoginError('Tidak dapat terhubung ke server.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regName.trim() || !regEmail.trim()) return
    setRegLoading(true)
    setRegError('')
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          monthly_income: Number(regIncome) || 0,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setRegError(json.error || 'Pendaftaran gagal.')
        return
      }
      const user = json.data
      onLogin({ userId: user.id, userName: user.name, monthlyIncome: user.monthly_income })
    } catch {
      setRegError('Tidak dapat terhubung ke server.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center space-y-2">
        <div className="text-5xl">💸</div>
        <h1 className="text-3xl font-bold text-text-primary">Spendly</h1>
        <p className="text-text-secondary text-sm">Kelola keuangan dengan cerdas</p>
      </div>

      {/* Tab switcher */}
      <div className="w-full max-w-sm mb-6">
        <div className="card-solid p-1 flex rounded-xl">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'login' ? 'bg-accent text-background' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'register' ? 'bg-accent text-background' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Daftar
          </button>
        </div>
      </div>

      {/* Login form */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div className="card-solid p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Nama Pengguna</label>
              <input
                type="text"
                value={loginName}
                onChange={e => setLoginName(e.target.value)}
                placeholder="Masukkan nama Anda"
                className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
              />
            </div>
            {loginError && <p className="text-xs text-danger">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-accent text-background py-3 rounded-lg font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {loginLoading ? 'Memuat...' : 'Masuk'}
            </button>
          </div>
          <p className="text-center text-xs text-text-secondary">
            Belum punya akun?{' '}
            <button type="button" onClick={() => setMode('register')} className="text-accent hover:underline">
              Daftar sekarang
            </button>
          </p>
        </form>
      )}

      {/* Register form */}
      {mode === 'register' && (
        <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4">
          <div className="card-solid p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Nama Lengkap</label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Nama Anda"
                className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="email@contoh.com"
                className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Pendapatan Bulanan (Rp)</label>
              <input
                type="number"
                value={regIncome}
                onChange={e => setRegIncome(e.target.value)}
                placeholder="5000000"
                className="w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            {regError && <p className="text-xs text-danger">{regError}</p>}
            <button
              type="submit"
              disabled={regLoading}
              className="w-full bg-accent text-background py-3 rounded-lg font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {regLoading ? 'Mendaftar...' : 'Buat Akun'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
