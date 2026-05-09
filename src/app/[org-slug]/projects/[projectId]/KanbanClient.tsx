'use client'
import { useState } from 'react'
import Link from 'next/link'
import { getTokens } from '@/lib/tokens'
import { useDark } from '@/components/shell/DarkProvider'
import { AppHeader } from '@/components/shell/AppHeader'
import { Btn } from '@/components/ui/Btn'
import { Icon, Icons } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'

const COLUMNS = [
  { id: 'TODO',        label: 'To do',      color: '#71717A' },
  { id: 'IN_PROGRESS', label: 'In progress', color: '#7C3AED' },
  { id: 'IN_REVIEW',   label: 'In review',   color: '#D97706' },
  { id: 'DONE',        label: 'Done',        color: '#16A34A' },
] as const

interface Task {
  id: string; title: string; status: string; nodeId: string
  dueDate: string | null; assigneeId: string | null; assigneeName: string | null
  checklistItems: { text: string; done: boolean }[]
}
interface Member { id: string; name: string | null }

interface Props {
  orgSlug: string; orgId: string
  project: { id: string; name: string; templateName: string }
  tasks: Task[]; members: Member[]; canEdit: boolean
}

export function KanbanClient({ orgSlug, orgId, project, tasks: initialTasks, members, canEdit }: Props) {
  const { dark } = useDark()
  const t = getTokens(dark)
  const [tasks, setTasks] = useState(initialTasks)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const grouped = COLUMNS.map(col => ({
    ...col,
    items: tasks.filter(tk => tk.status === col.id),
  }))

  async function moveTask(taskId: string, newStatus: string) {
    setTasks(prev => prev.map(tk => tk.id === taskId ? { ...tk, status: newStatus } : tk))
    try {
      await fetch(`/api/tasks/${orgId}/${project.id}/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      // Revert optimistic update on network error
      setTasks(initialTasks)
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${orgId}/${project.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, nodeId: 'default' }),
      })
      if (res.ok) {
        const { task } = await res.json()
        setTasks(prev => [...prev, {
          id: task.id,
          title: task.title,
          status: task.status,
          nodeId: task.nodeId,
          dueDate: null,
          assigneeId: null,
          assigneeName: null,
          checklistItems: [],
        }])
        setNewTitle('')
        setCreating(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={[
          <Link key="projects" href={`/${orgSlug}/projects`} style={{ color: 'inherit', textDecoration: 'none' }}>Projects</Link>,
          project.name,
        ]}
        right={canEdit ? (
          <Btn size="sm" variant="primary" dark={dark} icon={Icons.plus} onClick={() => setCreating(true)}>
            New task
          </Btn>
        ) : undefined}
        tabs={[{ id: 'board', label: 'Board', icon: Icons.tasks }]}
        activeTab="board"
      />

      {/* Kanban board */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {grouped.map(col => (
          <div
            key={col.id}
            onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
            onDragLeave={() => setDragOver(prev => prev === col.id ? null : prev)}
            onDrop={() => {
              if (dragId && dragId !== col.id) {
                const task = tasks.find(tk => tk.id === dragId)
                if (task && task.status !== col.id) moveTask(dragId, col.id)
                setDragId(null); setDragOver(null)
              }
            }}
            style={{
              width: 260, flexShrink: 0,
              background: dragOver === col.id ? t.accentSoft : t.surface2,
              border: `1px solid ${dragOver === col.id ? t.accent : t.border}`,
              borderRadius: 8, display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 120px)',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {/* Column header */}
            <div style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: col.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{col.label}</span>
              <Pill dark={dark} mono>{col.items.length}</Pill>
            </div>

            {/* Cards */}
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
              {col.items.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={e => { setDragId(task.id); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    background: t.surface, border: `1px solid ${t.border}`,
                    borderLeft: `3px solid ${col.color}`, borderRadius: 6,
                    padding: '8px 10px', cursor: 'grab',
                    opacity: dragId === task.id ? 0.4 : 1,
                    boxShadow: t.shadow,
                    transition: 'box-shadow 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = t.shadowLg)}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = t.shadow)}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: t.text, marginBottom: 6, lineHeight: 1.35 }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: t.textMuted }}>
                    {task.dueDate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)' }}>
                        <Icon d={Icons.calendar} size={10} />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {task.checklistItems.length > 0 && (
                      <span style={{ fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Icon d={Icons.check} size={10} />
                        {task.checklistItems.filter(c => c.done).length}/{task.checklistItems.length}
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    {task.assigneeName && (
                      <div title={task.assigneeName} style={{ width: 18, height: 18, borderRadius: '50%', background: t.accent + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: t.accent, flexShrink: 0 }}>
                        {task.assigneeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {col.items.length === 0 && (
                <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: 11, color: t.textSubtle, border: `1px dashed ${t.border}`, borderRadius: 6 }}>
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create task modal */}
      {creating && canEdit && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setCreating(false) }}
        >
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, width: 380, boxShadow: t.shadowLg }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, margin: '0 0 14px' }}>New task</h2>
            <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required autoFocus
                placeholder="Task title…"
                style={{ padding: '8px 10px', fontSize: 13, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontFamily: 'inherit', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setCreating(false); setNewTitle('') }}
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '8px', background: t.accent, border: 'none', color: 'white', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task detail slide-over */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          orgId={orgId}
          projectId={project.id}
          members={members}
          canEdit={canEdit}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => {
            setTasks(prev => prev.map(tk => tk.id === updated.id ? updated : tk))
            setSelectedTask(null)
          }}
        />
      )}
    </>
  )
}

// ── Task detail slide-over ────────────────────────────────────────────────────

function TaskDetail({
  task, orgId, projectId, members, canEdit, onClose, onUpdate,
}: {
  task: Task; orgId: string; projectId: string; members: Member[]
  canEdit: boolean; onClose: () => void; onUpdate: (t: Task) => void
}) {
  const { dark } = useDark()
  const t = getTokens(dark)
  const [title, setTitle] = useState(task.title)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/tasks/${orgId}/${projectId}/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, assigneeId: assigneeId || null }),
      })
      if (!res.ok) { setError('Failed to save'); return }
      const assignee = members.find(m => m.id === assigneeId)
      onUpdate({
        ...task,
        title,
        assigneeId: assigneeId || null,
        assigneeName: assignee?.name ?? null,
      })
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    background: t.surface2, border: `1px solid ${t.border}`,
    borderRadius: 6, color: t.text, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 380, height: '100%', background: t.surface, borderLeft: `1px solid ${t.border}`, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, margin: 0 }}>Task detail</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSubtle, padding: 4, display: 'flex' }}>
            <Icon d={Icons.x} size={16} />
          </button>
        </div>

        {error && <div style={{ color: t.red, fontSize: 12, padding: '6px 10px', background: t.redSoft, borderRadius: 5 }}>{error}</div>}

        {/* Title */}
        <div>
          <label style={{ fontSize: 11, color: t.textMuted, display: 'block', marginBottom: 5 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit} style={inputStyle} />
        </div>

        {/* Status badge */}
        <div>
          <label style={{ fontSize: 11, color: t.textMuted, display: 'block', marginBottom: 5 }}>Status</label>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>{task.status.replace('_', ' ')}</span>
          <div style={{ fontSize: 10.5, color: t.textSubtle, marginTop: 2 }}>Drag the card to change status</div>
        </div>

        {/* Assignee */}
        <div>
          <label style={{ fontSize: 11, color: t.textMuted, display: 'block', marginBottom: 5 }}>Assignee</label>
          <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} disabled={!canEdit} style={inputStyle}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
          </select>
        </div>

        {/* Footer */}
        {canEdit && (
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${t.border}`, display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              style={{ flex: 1, padding: '8px', background: t.accent, border: 'none', color: 'white', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
