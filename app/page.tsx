'use client'

import { useState } from 'react'
import TodayView from '@/components/views/TodayView'
import BalanceView from '@/components/views/BalanceView'
import BudgetView from '@/components/views/BudgetView'
import ReportsView from '@/components/views/ReportsView'
import TransactionsView from '@/components/views/TransactionsView'
import BottomNavigation from '@/components/BottomNavigation'
import LoginScreen from '@/components/LoginScreen'

type ActiveView = 'today' | 'balance' | 'budget' | 'reports' | 'transactions'

export interface UserSession {
  userId: string
  userName: string
  monthlyIncome: number
}

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [activeView, setActiveView] = useState<ActiveView>('today')

  if (!session) {
    return <LoginScreen onLogin={setSession} />
  }

  const renderView = () => {
    switch (activeView) {
      case 'today':       return <TodayView session={session} />
      case 'balance':     return <BalanceView session={session} />
      case 'budget':      return <BudgetView session={session} />
      case 'reports':     return <ReportsView session={session} />
      case 'transactions':return <TransactionsView session={session} />
      default:            return <TodayView session={session} />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-20">
        {renderView()}
      </div>
      <BottomNavigation activeView={activeView} onViewChange={setActiveView} />
    </div>
  )
}
