interface ProgressBarProps {
  spent: number
  limit: number
  showLabel?: boolean
}

export default function ProgressBar({ spent, limit, showLabel = true }: ProgressBarProps) {
  const percentage = Math.min((spent / limit) * 100, 100)
  
  // Determine color based on percentage
  let barColor = '#00D084' // success
  if (percentage > 90) barColor = '#FF6B6B' // danger
  else if (percentage > 70) barColor = '#FFB800' // warning
  else barColor = '#06CFF5' // accent

  return (
    <div className="w-full">
      <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-2 text-xs text-text-secondary">
          <span>{Math.round(percentage)}% used</span>
          <span>{Math.round(100 - percentage)}% remaining</span>
        </div>
      )}
    </div>
  )
}
