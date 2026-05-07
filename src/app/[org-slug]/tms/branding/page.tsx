'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Branding = { logoUrl: string; primaryColor: string; companyName: string }

export default function TmsBrandingPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const [branding, setBranding] = useState<Branding>({ logoUrl: '', primaryColor: '#6366f1', companyName: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/tms/${slug}/branding`)
      .then((r) => r.json())
      .then((d) => {
        if (d.branding) setBranding(d.branding)
      })
  }, [slug])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/tms/${slug}/branding`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branding }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Branding</h1>
      <p className="text-slate-500 text-sm mb-6">Customize your org appearance</p>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        {([
          ['companyName', 'Company Name', 'text'],
          ['logoUrl', 'Logo URL', 'url'],
          ['primaryColor', 'Primary Color', 'color'],
        ] as const).map(([key, label, type]) => (
          <div key={key}>
            <label className="block text-slate-500 text-xs uppercase mb-1">{label}</label>
            <input
              type={type}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
              value={branding[key]}
              onChange={(e) => setBranding({ ...branding, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 bg-emerald-500 text-slate-950 rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Branding'}
      </button>
    </div>
  )
}
