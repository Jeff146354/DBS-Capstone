export const USE_MOCK = true // set to false to use live API

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

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2025-01-15T10:30:00'),
    category: 'Cafe',
    categoryEmoji: '☕',
    merchant: 'Kopi Kenangan',
    amount: 35000,
    type: 'expense',
    account: 'GCash',
    note: 'Morning coffee'
  },
  {
    id: '2',
    date: new Date('2025-01-15T14:15:00'),
    category: 'Food',
    categoryEmoji: '🍕',
    merchant: 'Gojek Food',
    amount: 75000,
    type: 'expense',
    account: 'GCash',
    note: 'Lunch'
  },
  {
    id: '3',
    date: new Date('2025-01-14T18:45:00'),
    category: 'Transport',
    categoryEmoji: '🚗',
    merchant: 'Grab',
    amount: 45000,
    type: 'expense',
    account: 'GCash'
  },
  {
    id: '4',
    date: new Date('2025-01-14T09:00:00'),
    category: 'Salary',
    categoryEmoji: '💼',
    merchant: 'Employer',
    amount: 5000000,
    type: 'income',
    account: 'BCA',
    note: 'Monthly salary'
  },
  {
    id: '5',
    date: new Date('2025-01-13T12:30:00'),
    category: 'Shopping',
    categoryEmoji: '🛍️',
    merchant: 'Tokopedia',
    amount: 250000,
    type: 'expense',
    account: 'Credit Card'
  },
  {
    id: '6',
    date: new Date('2025-01-13T08:00:00'),
    category: 'Education',
    categoryEmoji: '📚',
    merchant: 'Udemy',
    amount: 99000,
    type: 'expense',
    account: 'GCash'
  },
  {
    id: '7',
    date: new Date('2025-01-12T19:20:00'),
    category: 'Travel',
    categoryEmoji: '✈️',
    merchant: 'Tiket.com',
    amount: 1200000,
    type: 'expense',
    account: 'Credit Card',
    note: 'Flight to Bali'
  },
  {
    id: '8',
    date: new Date('2025-01-12T16:00:00'),
    category: 'Home',
    categoryEmoji: '🏠',
    merchant: 'Apartment Rent',
    amount: 2000000,
    type: 'expense',
    account: 'BCA',
    note: 'Monthly rent'
  },
  {
    id: '9',
    date: new Date('2025-01-11T11:00:00'),
    category: 'Cafe',
    categoryEmoji: '☕',
    merchant: 'Starbucks',
    amount: 65000,
    type: 'expense',
    account: 'GCash'
  },
  {
    id: '10',
    date: new Date('2025-01-10T20:00:00'),
    category: 'Shopping',
    categoryEmoji: '🛍️',
    merchant: 'Shopee',
    amount: 180000,
    type: 'expense',
    account: 'Credit Card'
  }
]

// Mock Accounts
export const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'GCash Wallet',
    type: 'payment',
    balance: 850000,
    icon: '📱'
  },
  {
    id: '2',
    name: 'BCA Savings',
    type: 'savings',
    balance: 3500000,
    icon: '🏦'
  },
  {
    id: '3',
    name: 'BDO Credit Card',
    type: 'credit',
    balance: -250000,
    icon: '💳'
  },
  {
    id: '4',
    name: 'Investment Account',
    type: 'savings',
    balance: 2100000,
    icon: '📈'
  }
]

// Mock Budgets
export const mockBudgets: Budget[] = [
  {
    category: 'Travelling',
    categoryEmoji: '✈️',
    spent: 1200000,
    limit: 1500000
  },
  {
    category: 'Education',
    categoryEmoji: '📚',
    spent: 99000,
    limit: 300000
  },
  {
    category: 'Cafe',
    categoryEmoji: '☕',
    spent: 100000,
    limit: 150000
  },
  {
    category: 'Clothing',
    categoryEmoji: '👕',
    spent: 0,
    limit: 500000
  },
  {
    category: 'Home',
    categoryEmoji: '🏠',
    spent: 2000000,
    limit: 2000000
  },
  {
    category: 'Car',
    categoryEmoji: '🚗',
    spent: 45000,
    limit: 200000
  },
  {
    category: 'Utilities',
    categoryEmoji: '💡',
    spent: 150000,
    limit: 200000
  },
  {
    category: 'Food',
    categoryEmoji: '🍕',
    spent: 75000,
    limit: 300000
  }
]

// Mock Expense Categories for Reports
export const mockExpenseCategories: ExpenseCategory[] = [
  { name: 'Home', amount: 2000000, percentage: 48, color: '#FF6B6B' },
  { name: 'Travel', amount: 1200000, percentage: 29, color: '#4ECDC4' },
  { name: 'Shopping', amount: 430000, percentage: 10, color: '#95E1D3' },
  { name: 'Education', amount: 99000, percentage: 2, color: '#FFB3BA' },
  { name: 'Transport', amount: 45000, percentage: 1, color: '#FFFFBA' },
  { name: 'Cafe', amount: 100000, percentage: 2, color: '#A0E7E5' },
  { name: 'Other', amount: 150000, percentage: 4, color: '#7FD8BE' }
]

// Spending trend (last 7 days)
export const mockSpendingTrend = [
  { day: 'Mon', amount: 180000 },
  { day: 'Tue', amount: 220000 },
  { day: 'Wed', amount: 150000 },
  { day: 'Thu', amount: 280000 },
  { day: 'Fri', amount: 350000 },
  { day: 'Sat', amount: 420000 },
  { day: 'Sun', amount: 290000 }
]

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

export const getTotalBalance = (accounts: Account[]): number => {
  return accounts.reduce((sum, account) => sum + account.balance, 0)
}

export const getMonthlySpending = (transactions: Transaction[]): number => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  return transactions
    .filter(t => {
      const txDate = new Date(t.date)
      return txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear &&
             t.type === 'expense'
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

export const getTotalIncome = (transactions: Transaction[]): number => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  return transactions
    .filter(t => {
      const txDate = new Date(t.date)
      return txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear &&
             t.type === 'income'
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

export const getSpendingStatus = (spent: number, limit: number): 'aman' | 'hati-hati' | 'boros' => {
  const percentage = (spent / limit) * 100
  if (percentage <= 70) return 'aman'
  if (percentage <= 90) return 'hati-hati'
  return 'boros'
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
