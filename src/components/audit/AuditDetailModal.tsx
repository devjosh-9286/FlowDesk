'use client'
import type { AuditEntry } from '@/lib/audit'

export function AuditDetailModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const allKeys = Array.from(
    new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})])
  )

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl w-[520px] max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-5 border-b border-slate-800">
          <div>
            <p className="text-slate-100 font-bold">{entry.entityType}: {entry.entityLabel}</p>
            <p className="text-slate-500 text-xs mt-1">
              {new Date(entry.createdAt).toLocaleString()} · {entry.org?.name ?? 'Platform'} · {entry.actor.name}
              {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 bg-slate-800 rounded px-2 py-1 text-sm hover:text-slate-100">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {allKeys.map((key) => {
            const bVal = entry.before?.[key]
            const aVal = entry.after?.[key]
            const changed = JSON.stringify(bVal) !== JSON.stringify(aVal)
            return (
              <div key={key}>
                <p className={`font-mono text-xs uppercase tracking-wider mb-2 ${changed ? 'text-slate-400' : 'text-slate-600'}`}>
                  {key}
                  {!changed && <span className="ml-2 text-slate-700 normal-case">unchanged</span>}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {entry.before !== null && (
                    <div>
                      <p className="text-slate-600 text-xs mb-1">Before</p>
                      <div className={`rounded-md p-3 font-mono text-xs break-all ${changed ? 'bg-red-950 border border-red-900 text-red-300' : 'bg-slate-950 border border-slate-800 text-slate-600'}`}>
                        {bVal !== undefined ? JSON.stringify(bVal) : '—'}
                      </div>
                    </div>
                  )}
                  {entry.after !== null && (
                    <div>
                      <p className="text-slate-600 text-xs mb-1">After</p>
                      <div className={`rounded-md p-3 font-mono text-xs break-all ${changed ? 'bg-emerald-950 border border-emerald-900 text-emerald-300' : 'bg-slate-950 border border-slate-800 text-slate-600'}`}>
                        {aVal !== undefined ? JSON.stringify(aVal) : '—'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between items-center px-5 py-3 border-t border-slate-800">
          <span className="text-slate-600 text-xs font-mono">{entry.id}</span>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify({ before: entry.before, after: entry.after }, null, 2))}
            className="text-slate-500 bg-slate-800 rounded px-3 py-1.5 text-xs hover:text-slate-100"
          >
            ⎘ Copy JSON
          </button>
        </div>
      </div>
    </div>
  )
}
