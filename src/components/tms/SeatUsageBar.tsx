export function SeatUsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100)
  const warn = pct >= 90
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={warn ? 'text-amber-400' : 'text-slate-400'}>{used} / {limit} seats</span>
        {warn && <span className="text-amber-400">Near limit</span>}
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full">
        <div
          className={`h-1.5 rounded-full transition-all ${warn ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
