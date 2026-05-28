import { formatCurrency } from '@/lib/mockData'

interface TransactionCardProps {
  id: string
  date: Date
  category: string
  categoryEmoji: string
  merchant: string
  amount: number
  type: 'expense' | 'income' | 'transfer'
  account?: string
  onDelete?: (id: string) => void
}

export default function TransactionCard({
  id,
  date,
  category,
  categoryEmoji,
  merchant,
  amount,
  type,
  account,
  onDelete,
}: TransactionCardProps) {
  // Dates from API are YYYY-MM-DD with no time component.
  // Parse as local date to avoid UTC-offset artifacts (e.g. showing 07:00 for midnight UTC).
  const [year, month, day] = date.toISOString().split('T')[0].split('-').map(Number)
  const localDate = new Date(year, month - 1, day)
  const dateString = localDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  const isExpense = type === 'expense'

  return (
    <div className="card-solid p-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-2xl">{categoryEmoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-medium truncate">{merchant}</p>
          <p className="text-text-secondary text-sm">{category} • {dateString}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`font-mono font-semibold text-sm ${
            type === 'income' ? 'text-success' : isExpense ? 'text-danger' : 'text-accent'
          }`}>
            {type === 'income' ? '+' : type === 'transfer' ? '' : '-'}{formatCurrency(amount)}
          </p>
          {account && <p className="text-text-secondary text-xs">{account}</p>}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-danger/60 hover:text-danger p-1 rounded"
            aria-label="Hapus transaksi"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}
