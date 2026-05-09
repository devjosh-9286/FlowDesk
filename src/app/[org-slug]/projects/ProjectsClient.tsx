'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getTokens } from '@/lib/tokens'
import { useDark } from '@/components/shell/DarkProvider'
import { AppHeader } from '@/components/shell/AppHeader'
import { Btn } from '@/components/ui/Btn'
import { Icons } from '@/components/ui/Icon'

interface Project {
  id: string; name: string; status: string; templateName: string
  deptName: string; taskCount: number
}
interface Template { id: string; name: string }
interface Dept { id: string; name: string }

interface Props {
  orgSlug: string; orgId: string; canCreate: boolean
  projects: Project[]; templates: Template[]; departments: Dept[]
}

export function ProjectsClient({ orgSlug, orgId, canCreate, projects, templates, departments }: Props) {
  const { dark } = useDark()
  const t = getTokens(dark)
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', flowTemplateId: '', deptId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DONE' | 'ARCHIVED'>('ALL')

  const filtered = projects.filter(p => filter === 'ALL' || p.status === filter)

  function closeModal() {
    setCreating(false)
    setForm({ name: '', flowTemplateId: '', deptId: '' })
    setError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.flowTemplateId || !form.deptId) { setError('Select template and department'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/projects/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to create project')
        return
      }
      const { project } = await res.json()
      router.push(`/${orgSlug}/projects/${project.id}`)
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return t.accent
    if (s === 'DONE') return t.green
    return t.textSubtle
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    background: t.surface2, border: `1px solid ${t.border}`,
    borderRadius: 6, color: t.text, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={['Projects']}
        right={canCreate && (
          <Btn size="sm" variant="primary" dark={dark} icon={Icons.plus} onClick={() => setCreating(true)}>
            New project
          </Btn>
        )}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['ALL', 'ACTIVE', 'DONE', 'ARCHIVED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px', fontSize: 12, fontWeight: filter === f ? 600 : 500,
                background: filter === f ? t.accent : t.surface,
                color: filter === f ? 'white' : t.textMuted,
                border: `1px solid ${filter === f ? t.accent : t.border}`,
                borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Create modal */}
        {creating && canCreate && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          >
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, width: 440, boxShadow: t.shadowLg }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: '0 0 16px' }}>New project</h2>
              {error && <div style={{ color: t.red, fontSize: 12, marginBottom: 10, padding: '6px 10px', background: t.redSoft, borderRadius: 5 }}>{error}</div>}
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: t.textMuted, display: 'block', marginBottom: 5 }}>Project name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required autoFocus
                    style={inputStyle}
                    placeholder="e.g. Q3 Content Calendar"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: t.textMuted, display: 'block', marginBottom: 5 }}>Flow template</label>
                  {templates.length === 0 ? (
                    <div style={{ fontSize: 12, color: t.amber, padding: '6px 0' }}>
                      No templates yet.{' '}
                      <Link href={`/${orgSlug}/templates`} style={{ color: t.accent }}>Create one first →</Link>
                    </div>
                  ) : (
                    <select
                      value={form.flowTemplateId}
                      onChange={e => setForm(f => ({ ...f, flowTemplateId: e.target.value }))}
                      required
                      style={inputStyle}
                    >
                      <option value="">Select template…</option>
                      {templates.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: t.textMuted, display: 'block', marginBottom: 5 }}>Department</label>
                  {departments.length === 0 ? (
                    <div style={{ fontSize: 12, color: t.amber, padding: '6px 0' }}>No departments configured yet.</div>
                  ) : (
                    <select
                      value={form.deptId}
                      onChange={e => setForm(f => ({ ...f, deptId: e.target.value }))}
                      required
                      style={inputStyle}
                    >
                      <option value="">Select department…</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button" onClick={closeModal}
                    style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
                  >Cancel</button>
                  <button
                    type="submit" disabled={loading || templates.length === 0 || departments.length === 0}
                    style={{ flex: 1, padding: '8px', background: t.accent, border: 'none', color: 'white', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, opacity: (loading || templates.length === 0 || departments.length === 0) ? 0.5 : 1 }}
                  >{loading ? 'Creating…' : 'Create project'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects table */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: t.textSubtle, fontSize: 14 }}>
            {filter === 'ALL' ? (
              <>No projects yet.{canCreate && (
                <> <button onClick={() => setCreating(true)} style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>Create one →</button></>
              )}</>
            ) : (
              `No ${filter.toLowerCase()} projects.`
            )}
          </div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 0.5fr',
              padding: '7px 14px', background: t.surface2,
              borderBottom: `1px solid ${t.border}`,
              fontSize: 10.5, fontWeight: 600, color: t.textSubtle,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              <div>Project</div><div>Template</div><div>Department</div><div>Tasks</div><div>Status</div>
            </div>
            {filtered.map((p, i) => (
              <Link key={p.id} href={`/${orgSlug}/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 0.5fr', padding: '9px 14px', alignItems: 'center', borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${t.border}`, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{p.templateName}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{p.deptName}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: t.textMuted }}>{p.taskCount}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(p.status) }}>
                      {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
