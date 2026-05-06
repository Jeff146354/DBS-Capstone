interface StatusBadgeProps {
  status: 'aman' | 'hati-hati' | 'boros'
}

const statusConfig = {
  aman: { emoji: '🟢', text: 'AMAN', className: 'status-aman' },
  'hati-hati': { emoji: '🟡', text: 'HATI-HATI', className: 'status-hati-hati' },
  boros: { emoji: '🔴', text: 'BOROS', className: 'status-boros' }
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-xs ${config.className}`}>
      <span>{config.emoji}</span>
      <span>{config.text}</span>
    </div>
  )
}
