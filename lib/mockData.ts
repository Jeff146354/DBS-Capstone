// Mock data kept for reference only — app now uses live API
export const USE_MOCK = false

export interface Transaction {
  id: string
  date: Date
  category: string
  categoryEmoji: string
  merchant: string
  amount: number
  type: 'expense' | 'income' | 'transfer'
  account: string
  note?: string
}

export interface Account {
  id: string
  name: string
  type: 'payment' | 'credit' | 'savings'
  balance: number
  icon: string
}

export interface Budget {
  category: string
  categoryEmoji: string
  spent: number
  limit: number
}

export interface ExpenseCategory {
  name: string
  amount: number
  percentage: number
  color: string
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const getGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Pagi'
  if (hour < 17) return 'Siang'
  if (hour < 19) return 'Sore'
  return 'Malam'
}

export const getSpendingStatus = (spent: number, limit: number): 'aman' | 'hati-hati' | 'boros' => {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0
  if (percentage <= 70) return 'aman'
  if (percentage <= 90) return 'hati-hati'
  return 'boros'
}

export const getTodaySpending = (transactions: Transaction[]): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return transactions
    .filter(t => {
      const txDate = new Date(t.date)
      txDate.setHours(0, 0, 0, 0)
      return txDate.getTime() === today.getTime() && t.type === 'expense'
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

export const getTotalBalance = (accounts: Account[]): number =>
  accounts.reduce((sum, a) => sum + a.balance, 0)

export const getMonthlySpending = (transactions: Transaction[]): number => {
  const now = new Date()
  return transactions
    .filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        t.type === 'expense'
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

export const getTotalIncome = (transactions: Transaction[]): number => {
  const now = new Date()
  return transactions
    .filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        t.type === 'income'
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

// Kept for BalanceView fallback
export const mockAccounts: Account[] = []
export const mockTransactions: Transaction[] = []
export const mockBudgets: Budget[] = []
export const mockExpenseCategories: ExpenseCategory[] = []
export const mockSpendingTrend = []
