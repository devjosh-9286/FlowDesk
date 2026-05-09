'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateOrgForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inferSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create workspace')
      return
    }
    const { org } = await res.json()
    router.push(`/${org.slug}`)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        width: '100%', padding: '10px', fontSize: 13, fontWeight: 500,
        background: 'transparent', border: '1px dashed #35353F',
        color: '#71717A', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >+ Create new workspace</button>
  )

  return (
    <form onSubmit={handleSubmit} style={{ background: '#121217', border: '1px solid #26262E', borderRadius: 10, padding: '16px' }}>
      {error && <div style={{ color: '#F87171', fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#A1A1AA', marginBottom: 5 }}>Workspace name</label>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setSlug(inferSlug(e.target.value)) }}
          required
          placeholder="Acme Inc."
          style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: '#17171D', border: '1px solid #26262E', borderRadius: 6, color: '#F4F4F5', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#A1A1AA', marginBottom: 5 }}>URL slug</label>
        <input
          value={slug}
          onChange={e => setSlug(e.target.value)}
          required
          placeholder="acme-inc"
          style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: '#17171D', border: '1px solid #26262E', borderRadius: 6, color: '#F4F4F5', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setOpen(false)}
          style={{ flex: 1, padding: '8px', fontSize: 13, background: 'transparent', border: '1px solid #26262E', color: '#A1A1AA', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button type="submit" disabled={loading}
          style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, background: '#7C3AED', border: 'none', color: 'white', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Creating…' : 'Create workspace'}
        </button>
      </div>
    </form>
  )
}
