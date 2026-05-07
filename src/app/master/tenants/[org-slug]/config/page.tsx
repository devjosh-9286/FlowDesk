'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Config = {
  plan: string
  seatLimit: number
  featureFlags: Record<string, boolean>
  ssoConfig: Record<string, unknown>
  branding: Record<string, unknown>
}

const FLAG_LABELS: Record<string, string> = {
  flowBuilder: 'Flow Builder',
  approvals: 'Approval Gates',
  analytics: 'Analytics',
  customBranding: 'Custom Branding',
}

export default function TenantConfigPage() {
  const { 'org-slug': orgSlug } = useParams<{ 'org-slug': string }>()
  const [config, setConfig] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/master/tenants/${orgSlug}`)
      .then((r) => r.json())
      .then((d) => setConfig(d.org.tenantConfig ?? {
        plan: 'free', seatLimit: 5,
        featureFlags: { flowBuilder: true, approvals: true, analytics: false, customBranding: false },
        ssoConfig: {}, branding: {},
      }))
  }, [orgSlug])

  async function save() {
    setSaving(true)
    await fetch(`/api/master/tenants/${orgSlug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!config) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Tenant Config</h1>
      <p className="text-slate-500 text-sm mb-6">{orgSlug}</p>

      {/* Plan & Seats */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-4">Plan & Limits</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 text-xs uppercase mb-1">Plan</label>
            <select
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
              value={config.plan}
              onChange={(e) => setConfig({ ...config, plan: e.target.value })}
            >
              {['free', 'pro', 'enterprise'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 text-xs uppercase mb-1">Seat Limit</label>
            <input
              type="number"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
              value={config.seatLimit}
              onChange={(e) => setConfig({ ...config, seatLimit: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      {/* Feature Flags */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-4">Feature Flags</h2>
        {Object.entries(FLAG_LABELS).map(([key, label]) => (
          <div key={key} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
            <span className="text-slate-300 text-sm">{label}</span>
            <button
              onClick={() => setConfig({ ...config, featureFlags: { ...config.featureFlags, [key]: !config.featureFlags[key] } })}
              className={`w-10 h-5 rounded-full transition-colors ${config.featureFlags[key] ? 'bg-emerald-500' : 'bg-slate-700'}`}
            />
          </div>
        ))}
      </section>

      {/* SSO */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-4">SSO Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          {(['provider', 'entityId', 'ssoUrl', 'certificate'] as const).map((field) => (
            <div key={field}>
              <label className="block text-slate-500 text-xs uppercase mb-1">{field}</label>
              <input
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
                value={String((config.ssoConfig as Record<string, unknown>)[field] ?? '')}
                onChange={(e) => setConfig({ ...config, ssoConfig: { ...config.ssoConfig, [field]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button onClick={() => window.history.back()} className="px-4 py-2 text-slate-400 border border-slate-700 rounded text-sm">Discard</button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-indigo-500 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
