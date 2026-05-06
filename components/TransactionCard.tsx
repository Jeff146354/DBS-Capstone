import { formatCurrency } from '@/lib/mockData'

interface TransactionCardProps {
  date: Date
  category: string
  categoryEmoji: string
  merchant: string
  amount: number
  type: 'expense' | 'income' | 'transfer'
  account?: string
}

export default function TransactionCard({
  date,
  category,
  categoryEmoji,
  merchant,
  amount,
  type,
  account
}: TransactionCardProps) {
  const isExpense = type === 'expense'
  const timeString = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="card-solid p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className="text-2xl">{categoryEmoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-medium truncate">{merchant}</p>
          <p className="text-text-secondary text-sm">{category} • {timeString}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-mono font-semibold text-sm ${
          type === 'income' ? 'text-success' : isExpense ? 'text-danger' : 'text-accent'
        }`}>
          {type === 'income' ? '+' : type === 'transfer' ? '' : '-'}{formatCurrency(amount)}
        </p>
        {account && <p className="text-text-secondary text-xs">{account}</p>}
      </div>
    </div>
  )
}
