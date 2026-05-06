'use client'

import { useState } from 'react'
import TodayView from '@/components/views/TodayView'
import BalanceView from '@/components/views/BalanceView'
import BudgetView from '@/components/views/BudgetView'
import ReportsView from '@/components/views/ReportsView'
import TransactionsView from '@/components/views/TransactionsView'
import BottomNavigation from '@/components/BottomNavigation'

type ActiveView = 'today' | 'balance' | 'budget' | 'reports' | 'transactions'

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>('today')

  const renderView = () => {
    switch (activeView) {
      case 'today':
        return <TodayView />
      case 'balance':
        return <BalanceView />
      case 'budget':
        return <BudgetView />
      case 'reports':
        return <ReportsView />
      case 'transactions':
        return <TransactionsView />
      default:
        return <TodayView />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {renderView()}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeView={activeView} onViewChange={setActiveView} />
    </div>
  )
}
