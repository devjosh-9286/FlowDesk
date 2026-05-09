'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTokens } from '@/lib/tokens'
import { useDark } from '@/components/shell/DarkProvider'
import { AppHeader } from '@/components/shell/AppHeader'
import { Btn } from '@/components/ui/Btn'
import { Icon, Icons } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import Link from 'next/link'

interface Template {
  id: string; name: string; projectCount: number
  publishedAt: string | null; createdAt: string; creatorName: string | null; nodeCount: number
}

interface Props { orgSlug: string; orgId: string; templates: Template[] }

export function TemplatesClient({ orgSlug, orgId, templates }: Props) {
  const { dark } = useDark()
  const t = getTokens(dark)
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/templates/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodes: [], edges: [] }),
      })
      if (res.ok) {
        const { template } = await res.json()
        router.push(`/${orgSlug}/templates/${template.id}`)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to create template')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={['Flow templates']}
        right={
          <Btn size="sm" variant="primary" dark={dark} icon={Icons.plus} onClick={() => setCreating(true)}>
            New template
          </Btn>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {creating && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={e => { if (e.target === e.currentTarget) { setCreating(false); setError('') } }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, width: 360, boxShadow: t.shadowLg }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, margin: '0 0 14px' }}>New template</h2>
              {error && <div style={{ color: t.red, fontSize: 12, marginBottom: 8 }}>{error}</div>}
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Template name…"
                  style={{ padding: '8px 10px', fontSize: 13, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontFamily: 'inherit', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { setCreating(false); setName(''); setError('') }}
                    style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 1, padding: '8px', background: t.accent, border: 'none', color: 'white', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Creating…' : 'Create & open'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {templates.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: t.textSubtle, fontSize: 14 }}>
            No templates yet.{' '}
            <button onClick={() => setCreating(true)} style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>Create one →</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {templates.map(tp => (
              <Link key={tp.id} href={`/${orgSlug}/templates/${tp.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = t.accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={Icons.flow} size={16} style={{ color: t.accent }} />
                    </div>
                    {tp.publishedAt ? <Pill tone="green" dark={dark}>Published</Pill> : <Pill dark={dark}>Draft</Pill>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>{tp.name}</div>
                  <div style={{ fontSize: 11.5, color: t.textMuted, marginBottom: 10 }}>{tp.nodeCount} stages · {tp.projectCount} projects</div>
                  <div style={{ fontSize: 10.5, color: t.textSubtle }}>by {tp.creatorName} · {new Date(tp.createdAt).toLocaleDateString()}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
