interface BottomNavigationProps {
  activeView: string
  onViewChange: (view: any) => void
}

export default function BottomNavigation({ activeView, onViewChange }: BottomNavigationProps) {
  const navItems = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'balance', label: 'Balance', icon: '💰' },
    { id: 'budget', label: 'Budget', icon: '📊' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'transactions', label: 'Transactions', icon: '💳' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-accent/10 px-0">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              activeView === item.id
                ? 'text-accent'
                : 'text-text-secondary hover:text-accent'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
