'use client'

import React, { useContext } from 'react'
import { DemoContext } from '../layout'
import { getTokens } from '@/lib/tokens'
import { AppHeader } from '@/components/shell/AppHeader'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Btn } from '@/components/ui/Btn'
import { Icon, Icons } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { SAMPLE_PROJECTS, STAGES, personById } from '@/lib/data'

const SPARKLINES = [
  { label: 'Active projects',   val: '12', delta: '+2',  tone: 'teal'  as const, data: [4,6,5,7,8,7,9,10,9,11,12,12] },
  { label: 'On track',          val: '8',  delta: '67%', tone: 'green' as const, data: [2,3,4,4,5,6,6,7,8,8,8,8] },
  { label: 'Blocked / at-risk', val: '4',  delta: '+1',  tone: 'amber' as const, data: [1,1,2,2,2,3,3,3,4,3,4,4] },
]

const APPROVALS = [
  { title: 'Investor update April',               by: 'u5', age: '2h', proj: 'Investor Update Memo',    flag: 'Regulated' },
  { title: 'Partnership press release — Halo',    by: 'u1', age: '5h', proj: 'Q2 Editorial Calendar',   flag: 'Press' },
  { title: 'Tier-3 pricing promo copy',           by: 'u4', age: '1d', proj: 'Pricing Page Copy',       flag: null },
]

const ACTIVITY = [
  { who: 'u3', act: 'moved',       obj: 'Homepage hero copy — v3',      to: 'Legal approval',  time: '09:42', tone: 'amber'  as const },
  { who: 'u5', act: 'approved',    obj: 'Winter roadmap recap',         to: 'Scheduled',       time: '09:11', tone: 'green'  as const },
  { who: 'u1', act: 'assigned',    obj: 'Partner case study — Halo',   to: 'Theo Lindqvist',  time: '08:50', tone: 'accent' as const },
  { who: 'u4', act: 'commented on',obj: 'Pricing page rework',         to: '',                time: '08:32', tone: 'neutral'as const },
  { who: 'u2', act: 'created flow',obj: 'Executive Memo · v1',        to: '',                time: 'Yesterday', tone: 'teal' as const },
]

function stageTone(stage: string) {
  if (stage.includes('Legal'))     return 'amber'  as const
  if (stage.includes('Publish') || stage.includes('Scheduled')) return 'accent' as const
  if (stage.includes('Editorial')) return 'blue'   as const
  return 'neutral' as const
}

export default function DashboardPage() {
  const { dark } = useContext(DemoContext)
  const t = getTokens(dark)

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={['Larkvale Media', 'Dashboard']}
        right={
          <>
            <Btn size="sm" icon={Icons.filter} dark={dark}>Filter</Btn>
            <Btn size="sm" variant="secondary" dark={dark} icon={Icons.plus}>New project</Btn>
          </>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {/* Welcome card */}
          <div style={{ padding: '14px 16px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Wednesday · Apr 23</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 2 }}>Good morning, Maya.</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                <span style={{ color: t.amber, fontWeight: 600 }}>3 approvals</span> waiting on you ·{' '}
                <span style={{ color: t.text, fontWeight: 600 }}>7 tasks</span> due this week
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Btn size="sm" variant="primary" dark={dark}>Review approvals</Btn>
              <Btn size="sm" variant="secondary" dark={dark}>Open my tasks</Btn>
            </div>
          </div>

          {SPARKLINES.map((s) => {
            const max = Math.max(...s.data)
            return (
              <div key={s.label} style={{ padding: '12px 14px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 500 }}>{s.label}</div>
                  <Pill tone={s.tone} dark={dark} mono>{s.delta}</Pill>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>{s.val}</div>
                  <svg width="80" height="28" viewBox="0 0 80 28" style={{ overflow: 'visible' }}>
                    <polyline
                      points={s.data.map((v, ix) => `${ix * (80 / 11)},${28 - (v / max) * 22}`).join(' ')}
                      fill="none"
                      stroke={t[s.tone as keyof typeof t] as string}
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
          {/* Projects table */}
          <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>All projects</div>
              <Pill dark={dark} mono>{SAMPLE_PROJECTS.length}</Pill>
              <div style={{ flex: 1 }} />
              <Btn size="xs" active dark={dark}>All</Btn>
              <Btn size="xs" dark={dark}>Mine</Btn>
              <Btn size="xs" dark={dark}>At risk</Btn>
              <div style={{ width: 1, height: 16, background: t.border, margin: '0 4px' }} />
              <Btn size="xs" icon={Icons.sort} dark={dark} />
              <Btn size="xs" icon={Icons.dots} dark={dark} />
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.8fr 0.9fr 1.1fr 1.1fr 0.6fr 0.7fr 0.8fr',
              padding: '6px 14px',
              background: t.surface2,
              borderBottom: `1px solid ${t.border}`,
              fontSize: 10.5, fontWeight: 600, color: t.textSubtle,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              <div>Project</div><div>Dept</div><div>Current stage</div>
              <div>Progress</div><div style={{ textAlign: 'right' }}>Tasks</div>
              <div>Due</div><div>Team</div>
            </div>

            {SAMPLE_PROJECTS.map((p, i) => {
              const stage = STAGES.find(s => p.stage.includes(s.label.split(' ')[0])) ?? STAGES[0]
              const isLast = i === SAMPLE_PROJECTS.length - 1
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.8fr 0.9fr 1.1fr 1.1fr 0.6fr 0.7fr 0.8fr',
                    padding: '8px 14px',
                    alignItems: 'center',
                    borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
                    cursor: 'pointer',
                    fontSize: 11.5,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = t.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: stage.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: t.textSubtle, fontFamily: 'var(--font-mono)' }}>{p.flow}</div>
                    </div>
                  </div>
                  <div style={{ color: t.textMuted }}>{p.dept}</div>
                  <div><Pill tone={stageTone(p.stage)} dark={dark}>{p.stage}</Pill></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 4, background: t.surface3, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${p.progress * 100}%`, height: '100%', background: p.status === 'at-risk' ? t.amber : p.status === 'blocked' ? t.red : t.accent }} />
                    </div>
                    <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: t.textMuted, minWidth: 28, textAlign: 'right' }}>{Math.round(p.progress * 100)}%</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.textMuted }}>{p.tasks}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: (p.status === 'at-risk' || p.status === 'blocked') ? t.amber : t.textMuted }}>{p.due}</div>
                  <AvatarStack users={p.team} size={18} dark={dark} />
                </div>
              )
            })}
          </section>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Pending approvals */}
            <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={Icons.approval} size={13} style={{ color: t.amber }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Pending your approval</div>
                <Pill tone="amber" dark={dark} mono>3</Pill>
              </div>
              {APPROVALS.map((a, i) => (
                <div key={i} style={{ padding: '10px 14px', borderBottom: i === APPROVALS.length - 1 ? 'none' : `1px solid ${t.border}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Avatar user={a.by} size={24} dark={dark} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 10.5, color: t.textSubtle, fontFamily: 'var(--font-mono)', marginBottom: 5 }}>{a.proj} · requested {a.age} ago</div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <Btn size="xs" variant="primary" dark={dark}>Approve</Btn>
                      <Btn size="xs" variant="secondary" dark={dark}>Reject</Btn>
                      {a.flag && <Pill tone="amber" dark={dark}>⚑ {a.flag}</Pill>}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Activity feed */}
            <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={Icons.zap} size={12} style={{ color: t.teal }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Activity</div>
                <div style={{ flex: 1 }} />
                <Btn size="xs" dark={dark}>Today</Btn>
              </div>
              <div style={{ padding: '4px 0' }}>
                {ACTIVITY.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 14px', fontSize: 11.5 }}>
                    <Avatar user={a.who} size={18} dark={dark} />
                    <div style={{ flex: 1, color: t.textMuted, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: t.text }}>{personById(a.who).name.split(' ')[0]}</span>{' '}
                      {a.act}{' '}
                      <span style={{ color: t.text, fontWeight: 500 }}>{a.obj}</span>
                      {a.to && <>{' → '}<Pill tone={a.tone} dark={dark} style={{ verticalAlign: 'middle' }}>{a.to}</Pill></>}
                    </div>
                    <div style={{ fontSize: 10.5, color: t.textSubtle, fontFamily: 'var(--font-mono)' }}>{a.time}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
