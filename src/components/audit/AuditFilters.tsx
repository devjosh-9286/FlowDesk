'use client'

type Filters = {
  orgSlug?: string
  entityType?: string
  action?: string
  actor?: string
  days: number
}

const ENTITY_TYPES = ['PROJECT', 'TASK', 'TEMPLATE', 'USER', 'ORG_MEMBERSHIP', 'DEPARTMENT', 'TENANT_CONFIG', 'APPROVAL', 'SUPERADMIN']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'ROLE_CHANGED', 'STAGE_ADVANCED', 'APPROVAL_GRANTED', 'APPROVAL_REJECTED', 'PLAN_CHANGED', 'FEATURE_FLAG_CHANGED', 'SSO_CONFIG_CHANGED', 'SUPERADMIN_ASSIGNED', 'SUPERADMIN_REVOKED']
const DAY_OPTIONS = [{ label: 'Last 7 days', value: 7 }, { label: 'Last 30 days', value: 30 }, { label: 'Last 90 days', value: 90 }]

export function AuditFilters({
  filters,
  onChange,
  showTenantFilter,
  onExport,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  showTenantFilter?: boolean
  onExport: () => void
}) {
  const set = (key: keyof Filters, value: string | number | undefined) =>
    onChange({ ...filters, [key]: value || undefined })

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      {showTenantFilter && (
        <input
          placeholder="Filter by tenant slug…"
          className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-300 text-xs"
          value={filters.orgSlug ?? ''}
          onChange={(e) => set('orgSlug', e.target.value)}
        />
      )}
      <select
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs"
        value={filters.entityType ?? ''}
        onChange={(e) => set('entityType', e.target.value)}
      >
        <option value="">All Entities</option>
        {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs"
        value={filters.action ?? ''}
        onChange={(e) => set('action', e.target.value)}
      >
        <option value="">All Actions</option>
        {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <input
        placeholder="Search actor…"
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-300 text-xs flex-1 min-w-[140px]"
        value={filters.actor ?? ''}
        onChange={(e) => set('actor', e.target.value)}
      />
      <select
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs"
        value={filters.days}
        onChange={(e) => onChange({ ...filters, days: Number(e.target.value) })}
      >
        {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button onClick={onExport} className="ml-auto bg-slate-800 text-slate-400 rounded px-3 py-1.5 text-xs hover:text-slate-100">
        ↓ Export CSV
      </button>
    </div>
  )
}
