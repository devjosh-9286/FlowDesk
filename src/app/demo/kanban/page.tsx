'use client'

import React, { useContext, useState } from 'react'
import { DemoContext } from '../layout'
import { getTokens } from '@/lib/tokens'
import { AppHeader } from '@/components/shell/AppHeader'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Btn } from '@/components/ui/Btn'
import { Icon, Icons } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { SAMPLE_TASKS, STAGES, personById, type Task } from '@/lib/data'

const CURRENT_STAGE_IDX = 2  // 'Legal' is current

export default function KanbanPage() {
  const { dark } = useContext(DemoContext)
  const t = getTokens(dark)
  const [tasks, setTasks] = useState(SAMPLE_TASKS)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('board')

  const grouped = STAGES.map(s => ({ ...s, items: tasks.filter(tk => tk.stage === s.id) }))

  const onDrop = (stageId: string) => {
    if (!dragId) return
    setTasks(prev => prev.map(tk => tk.id === dragId ? { ...tk, stage: stageId as Task['stage'] } : tk))
    setDragId(null)
    setDragOver(null)
  }

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={['Larkvale', 'Projects', 'Q2 Editorial Calendar']}
        right={
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
              <AvatarStack users={['u1','u2','u3','u4']} size={20} dark={dark} />
              <Btn size="xs" icon={Icons.plus} dark={dark} />
            </div>
            <Btn size="sm" icon={Icons.filter} dark={dark}>Filter</Btn>
            <Btn size="sm" icon={Icons.sort} dark={dark}>Group</Btn>
            <Btn size="sm" variant="primary" dark={dark} icon={Icons.plus}>New task</Btn>
          </>
        }
        tabs={[
          { id: 'board',    label: 'Board',    icon: Icons.tasks },
          { id: 'list',     label: 'List' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'flow',     label: 'Flow',     icon: Icons.flow },
          { id: 'files',    label: 'Files',    count: 14 },
          { id: 'activity', label: 'Activity' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Flow progress strip */}
      <div style={{
        padding: '10px 14px',
        background: t.surface,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}>
        <div style={{ fontSize: 10.5, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginRight: 12, flexShrink: 0 }}>
          Flow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0 }}>
          {STAGES.map((s, i) => {
            const done = i < CURRENT_STAGE_IDX
            const current = i === CURRENT_STAGE_IDX
            return (
              <React.Fragment key={s.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '3px 8px', borderRadius: 4,
                  background: current ? s.color + '18' : 'transparent',
                  border: current ? `1px solid ${s.color}40` : '1px solid transparent',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: done ? s.color : current ? s.color : t.surface3,
                    color: done || current ? 'white' : t.textSubtle,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    border: current ? 'none' : `1px solid ${t.border}`,
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: current ? 600 : 500, color: current ? s.color : done ? t.text : t.textMuted }}>
                    {s.label}
                  </div>
                  {s.type === 'approval' && <Icon d={Icons.lock} size={10} style={{ color: current ? s.color : t.textSubtle }} />}
                </div>
                {i < STAGES.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: done ? s.color : t.border, minWidth: 12 }} />
                )}
              </React.Fragment>
            )
          })}
        </div>
        <div style={{ marginLeft: 16, fontSize: 10.5, color: t.textSubtle, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
          v3 · 5 stages · 1 gate
        </div>
      </div>

      {/* Approval gate banner */}
      <div style={{
        padding: '8px 14px',
        background: t.amberSoft,
        borderBottom: `1px solid ${t.amber}33`,
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
      }}>
        <Icon d={Icons.approval} size={14} style={{ color: t.amber }} />
        <div style={{ flex: 1, color: t.text }}>
          <b>2 items</b> in <b>Legal approval</b> awaiting review from <b>Sasha Vogel</b> and <b>Maya Okafor</b> · mode{' '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>any-of</span>
        </div>
        <Btn size="xs" variant="secondary" dark={dark}>Nudge approvers</Btn>
        <Btn size="xs" variant="primary" dark={dark}>Review now</Btn>
      </div>

      {/* Board */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, height: '100%', minHeight: 0 }}>
          {grouped.map(stage => {
            const isGate = stage.type === 'approval'
            const isDropTarget = dragOver === stage.id
            return (
              <div
                key={stage.id}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
                onDragLeave={() => setDragOver(prev => prev === stage.id ? null : prev)}
                onDrop={() => onDrop(stage.id)}
                style={{
                  width: 240, flexShrink: 0,
                  background: isDropTarget ? t.accentSoft : t.surface2,
                  border: `1px solid ${isDropTarget ? t.accent : isGate ? t.amber + '55' : t.border}`,
                  borderRadius: 8,
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {/* Column header */}
                <div style={{
                  padding: '8px 10px',
                  borderBottom: `1px solid ${t.border}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: isGate ? t.amberSoft : 'transparent',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: stage.color }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{stage.label}</div>
                  {isGate && <Icon d={Icons.lock} size={11} style={{ color: t.amber }} />}
                  <Pill dark={dark} mono>{stage.items.length}</Pill>
                  <div style={{ flex: 1 }} />
                  <Btn size="xs" icon={Icons.plus} dark={dark} />
                  <Btn size="xs" icon={Icons.dots} dark={dark} />
                </div>

                {/* Cards */}
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
                  {stage.items.map(task => (
                    <TaskCard key={task.id} task={task} stageColor={stage.color} isGate={isGate} dark={dark} dragId={dragId} setDragId={setDragId} setDragOver={setDragOver} t={t} />
                  ))}
                  {stage.items.length === 0 && (
                    <div style={{
                      padding: '18px 10px', textAlign: 'center',
                      fontSize: 11, color: t.textSubtle,
                      border: `1px dashed ${t.border}`, borderRadius: 6,
                    }}>Drop tasks here</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function TaskCard({
  task, stageColor, isGate, dark, dragId, setDragId, setDragOver, t,
}: {
  task: Task
  stageColor: string
  isGate: boolean
  dark: boolean
  dragId: string | null
  setDragId: (id: string | null) => void
  setDragOver: (id: string | null) => void
  t: ReturnType<typeof getTokens>
}) {
  const overdue = task.due < 'Apr 24'
  return (
    <div
      draggable
      onDragStart={e => { setDragId(task.id); e.dataTransfer.effectAllowed = 'move' }}
      onDragEnd={() => { setDragId(null); setDragOver(null) }}
      style={{
        background: t.surface,
        border: `1px solid ${isGate ? t.amber + '66' : t.border}`,
        borderLeft: `3px solid ${stageColor}`,
        borderRadius: 6,
        padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 6,
        cursor: 'grab',
        opacity: dragId === task.id ? 0.4 : 1,
        boxShadow: t.shadow,
        transition: 'box-shadow 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = t.shadowLg}
      onMouseLeave={e => e.currentTarget.style.boxShadow = t.shadow}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ fontSize: 10, color: t.textSubtle, fontFamily: 'var(--font-mono)' }}>{task.id.toUpperCase()}</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {task.prio === 'high' && <Icon d={Icons.flag} size={10} style={{ color: t.red }} />}
          {task.labels.includes('regulated') && <Icon d={Icons.lock} size={10} style={{ color: t.amber }} />}
        </div>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 500, color: t.text, lineHeight: 1.35 }}>{task.title}</div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {task.labels.slice(0, 2).map(l => <Pill key={l} dark={dark}>{l}</Pill>)}
      </div>

      {/* Approval pending badge */}
      {isGate && task.approval === 'pending' && (
        <div style={{
          background: t.amberSoft, border: `1px solid ${t.amber}40`,
          borderRadius: 4, padding: '4px 6px',
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5,
        }}>
          <Icon d={Icons.clock} size={10} style={{ color: t.amber }} />
          <span style={{ color: t.amber, fontWeight: 600 }}>Awaiting legal · 2 approvers</span>
        </div>
      )}

      {/* Checklist progress bar */}
      {task.checklist[1] > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textSubtle, marginBottom: 2 }}>
            <span>Checklist</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{task.checklist[0]}/{task.checklist[1]}</span>
          </div>
          <div style={{ height: 3, background: t.surface3, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${(task.checklist[0] / task.checklist[1]) * 100}%`, height: '100%', background: task.checklist[0] === task.checklist[1] ? t.green : t.accent }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: t.textMuted }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', color: overdue ? t.red : t.textMuted }}>
          <Icon d={Icons.calendar} size={10} />{task.due}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)' }}>
          <Icon d={Icons.msg} size={10} />{task.comments}
        </span>
        <div style={{ flex: 1 }} />
        <Avatar user={task.assignee} size={18} dark={dark} />
      </div>
    </div>
  )
}
