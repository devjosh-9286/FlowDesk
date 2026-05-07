'use client'
import { useEffect, useState, useCallback } from 'react'
import { AuditFilters } from './AuditFilters'
import { AuditDetailModal } from './AuditDetailModal'
import type { AuditEntry } from '@/lib/audit'

const ENTITY_COLORS: Record<string, string> = {
  PROJECT: 'bg-blue-950 text-blue-300',
  TASK: 'bg-slate-800 text-slate-400',
  USER: 'bg-indigo-950 text-indigo-300',
  TENANT_CONFIG: 'bg-emerald-950 text-emerald-300',
  APPROVAL: 'bg-orange-950 text-orange-300',
  ORG_MEMBERSHIP: 'bg-purple-950 text-purple-300',
  SUPERADMIN: 'bg-red-950 text-red-300',
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-950 text-emerald-300',
  UPDATE: 'bg-slate-800 text-slate-400',
  DELETE: 'bg-red-950 text-red-300',
  ROLE_CHANGED: 'bg-indigo-950 text-indigo-300',
  STAGE_ADVANCED: 'bg-blue-950 text-blue-300',
  APPROVAL_GRANTED: 'bg-emerald-950 text-emerald-300',
  APPROVAL_REJECTED: 'bg-red-950 text-red-300',
}

export function AuditTable({ apiUrl, showTenantFilter }: { apiUrl: string; showTenantFilter?: boolean }) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<{ orgSlug?: string; entityType?: string; action?: string; actor?: string; days: number }>({ days: 7 })
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      )
      const res = await fetch(`${apiUrl}?${params}`)
      if (!res.ok) throw new Error(`Audit fetch failed: ${res.status}`)
      const data = await res.json()
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, filters])

  useEffect(() => { load() }, [load])

  function exportCsv() {
    const rows = [
      ['Timestamp', 'Tenant', 'Actor', 'Entity', 'Action', 'Event ID'],
      ...entries.map((e) => [e.createdAt, e.org?.slug ?? 'platform', e.actor.email, `${e.entityType}:${e.entityLabel}`, e.action, e.id]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `audit-export-${Date.now()}.csv`
    a.click()
  }

  return (
    <>
      <AuditFilters filters={filters} onChange={setFilters} showTenantFilter={showTenantFilter} onExport={exportCsv} />
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <p className="text-slate-600 text-xs mb-3">{total} events</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-600 text-[10px] uppercase border-b border-slate-800">
              <th className="text-left py-2 px-2">Timestamp</th>
              {showTenantFilter && <th className="text-left py-2 px-2">Tenant</th>}
              <th className="text-left py-2 px-2">Actor</th>
              <th className="text-left py-2 px-2">Entity</th>
              <th className="text-left py-2 px-2">Action</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-900 text-slate-400 hover:bg-slate-900/40">
                <td className="py-2 px-2 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                {showTenantFilter && (
                  <td className="py-2 px-2">
                    <span className="bg-slate-800 text-slate-500 rounded px-2 py-0.5 text-xs">
                      {entry.org?.slug ?? 'platform'}
                    </span>
                  </td>
                )}
                <td className="py-2 px-2 text-slate-100 text-xs">{entry.actor.name}</td>
                <td className="py-2 px-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold mr-1 ${ENTITY_COLORS[entry.entityType] ?? 'bg-slate-800 text-slate-400'}`}>
                    {entry.entityType}
                  </span>
                  <span className="text-slate-300 text-xs">{entry.entityLabel}</span>
                </td>
                <td className="py-2 px-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] ${ACTION_COLORS[entry.action] ?? 'bg-slate-800 text-slate-400'}`}>
                    {entry.action}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <button
                    onClick={() => setSelected(entry)}
                    className="text-xs text-slate-500 border border-slate-700 rounded px-2 py-1 hover:border-indigo-400 hover:text-indigo-400"
                  >
                    Details ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && <AuditDetailModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
