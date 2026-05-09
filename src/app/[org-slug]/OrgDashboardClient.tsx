'use client'
import Link from 'next/link'
import { getTokens } from '@/lib/tokens'
import { useDark } from '@/components/shell/DarkProvider'
import { AppHeader } from '@/components/shell/AppHeader'
import { Btn } from '@/components/ui/Btn'
import { Icon, Icons } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'

interface Props {
  orgSlug: string
  orgId: string
  stats: { activeProjects: number; pendingApprovals: number; myTasks: number }
  projects: { id: string; name: string; templateName: string; taskCount: number }[]
  pendingApprovals: { id: string; projectName: string; projectId: string; orgId: string; requestedAt: string }[]
  userName: string
}

export function OrgDashboardClient({ orgSlug, orgId, stats, projects, pendingApprovals, userName }: Props) {
  const { dark } = useDark()
  const t = getTokens(dark)

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={['Dashboard']}
        right={
          <Link href={`/${orgSlug}/projects`}>
            <Btn size="sm" variant="primary" dark={dark} icon={Icons.plus}>New project</Btn>
          </Link>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, margin: 0 }}>
            Good day, {userName.split(' ')[0]}.
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: '4px 0 0' }}>
            {stats.pendingApprovals > 0 && (
              <><span style={{ color: t.amber, fontWeight: 600 }}>{stats.pendingApprovals} approvals</span> waiting · </>
            )}
            <span style={{ color: t.text, fontWeight: 600 }}>{stats.myTasks} tasks</span> assigned to you
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Active projects',   value: stats.activeProjects,   icon: Icons.folder,   color: t.accent },
            { label: 'Pending approvals', value: stats.pendingApprovals, icon: Icons.approval, color: t.amber },
            { label: 'My open tasks',     value: stats.myTasks,          icon: Icons.check,    color: t.teal },
          ].map(s => (
            <div key={s.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon d={s.icon} size={16} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
          {/* Projects list */}
          <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Active projects</span>
              <Pill dark={dark} mono>{projects.length}</Pill>
              <div style={{ flex: 1 }} />
              <Link href={`/${orgSlug}/projects`} style={{ fontSize: 12, color: t.accent, textDecoration: 'none' }}>View all →</Link>
            </div>
            {projects.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: t.textSubtle, fontSize: 13 }}>
                No active projects.{' '}
                <Link href={`/${orgSlug}/projects`} style={{ color: t.accent }}>Create one →</Link>
              </div>
            ) : (
              projects.map((p, i) => (
                <Link key={p.id} href={`/${orgSlug}/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: i === projects.length - 1 ? 'none' : `1px solid ${t.border}`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.surface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: t.accent, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSubtle, fontFamily: 'var(--font-mono)' }}>{p.templateName}</div>
                    </div>
                    <Pill dark={dark} mono>{p.taskCount} tasks</Pill>
                  </div>
                </Link>
              ))
            )}
          </section>

          {/* Pending approvals */}
          <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d={Icons.approval} size={13} style={{ color: t.amber }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Pending your approval</span>
              {pendingApprovals.length > 0 && <Pill tone="amber" dark={dark} mono>{pendingApprovals.length}</Pill>}
            </div>
            {pendingApprovals.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: t.textSubtle, fontSize: 13 }}>All clear!</div>
            ) : (
              pendingApprovals.map((a, i) => (
                <div key={a.id} style={{ padding: '10px 14px', borderBottom: i === pendingApprovals.length - 1 ? 'none' : `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 2 }}>{a.projectName}</div>
                  <div style={{ fontSize: 10.5, color: t.textSubtle, marginBottom: 8 }}>
                    Requested {new Date(a.requestedAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ApproveBtn approvalId={a.id} orgId={a.orgId} projectId={a.projectId} decision="APPROVED" />
                    <ApproveBtn approvalId={a.id} orgId={a.orgId} projectId={a.projectId} decision="REJECTED" />
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function ApproveBtn({ approvalId, orgId, projectId, decision }: {
  approvalId: string; orgId: string; projectId: string; decision: 'APPROVED' | 'REJECTED'
}) {
  const { dark } = useDark()
  const t = getTokens(dark)

  async function act() {
    await fetch(`/api/approvals/${orgId}/${projectId}/${approvalId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    window.location.reload()
  }

  return (
    <button onClick={act} style={{
      padding: '4px 10px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      background: decision === 'APPROVED' ? t.greenSoft : t.redSoft,
      color: decision === 'APPROVED' ? t.green : t.red,
      border: `1px solid ${decision === 'APPROVED' ? t.green + '40' : t.red + '40'}`,
      borderRadius: 5,
    }}>
      {decision === 'APPROVED' ? 'Approve' : 'Reject'}
    </button>
  )
}
