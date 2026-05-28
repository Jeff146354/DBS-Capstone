'use client'

import { useState } from 'react'
import type { UserSession } from '@/app/page'
import { API_BASE } from '@/lib/config'

interface LoginScreenProps {
  onLogin: (session: UserSession) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginPw, setShowLoginPw] = useState(false)

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [showRegPw, setShowRegPw] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      })
      const json = await res.json()
      if (!json.success) {
        setLoginError(json.error || `Error ${res.status}`)
        return
      }
      const user = json.data
      onLogin({ userId: user.id, userName: user.name, monthlyIncome: user.monthly_income })
    } catch (err) {
      setLoginError(`Tidak dapat terhubung ke server. (${err})`)
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (regPassword !== regConfirm) {
      setRegError('Password tidak cocok.')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Password minimal 6 karakter.')
      return
    }
    setRegLoading(true)
    setRegError('')
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          monthly_income: 0,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setRegError(json.error || `Error ${res.status}`)
        return
      }
      const user = json.data
      onLogin({ userId: user.id, userName: user.name, monthlyIncome: user.monthly_income })
    } catch (err) {
      setRegError(`Tidak dapat terhubung ke server. (${err})`)
    } finally {
      setRegLoading(false)
    }
  }

  const inputClass = "w-full bg-bg-tertiary px-4 py-3 rounded-lg text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"

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
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setLoginError(''); setRegError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === m ? 'bg-accent text-background' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {m === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Login form ── */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div className="card-solid p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="email@contoh.com"
                className={inputClass}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Password</label>
              <div className="relative">
                <input
                  type={showLoginPw ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass + ' pr-10'}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs hover:text-text-primary"
                >
                  {showLoginPw ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                <p className="text-xs text-danger font-mono">⚠ {loginError}</p>
              </div>
            )}

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

      {/* ── Register form ── */}
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
                className={inputClass}
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
                className={inputClass}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Password</label>
              <div className="relative">
                <input
                  type={showRegPw ? 'text' : 'password'}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className={inputClass + ' pr-10'}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs hover:text-text-primary"
                >
                  {showRegPw ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Konfirmasi Password</label>
              <input
                type={showRegPw ? 'text' : 'password'}
                value={regConfirm}
                onChange={e => setRegConfirm(e.target.value)}
                placeholder="Ulangi password"
                className={inputClass}
                required
                autoComplete="new-password"
              />
            </div>

            {regError && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                <p className="text-xs text-danger font-mono">⚠ {regError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={regLoading}
              className="w-full bg-accent text-background py-3 rounded-lg font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {regLoading ? 'Mendaftar...' : 'Buat Akun'}
            </button>
          </div>
          <p className="text-center text-xs text-text-secondary">
            Sudah punya akun?{' '}
            <button type="button" onClick={() => setMode('login')} className="text-accent hover:underline">
              Masuk
            </button>
          </p>
        </form>
      )}
    </div>
  )
}
