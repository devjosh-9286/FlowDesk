'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { getTokens } from '@/lib/tokens'
import { useDark } from '@/components/shell/DarkProvider'
import { AppHeader } from '@/components/shell/AppHeader'
import { Btn } from '@/components/ui/Btn'
import { Icon, Icons } from '@/components/ui/Icon'
import Link from 'next/link'

const NODE_TYPES = {
  stage:     { label: 'Stage',     color: '#2563EB' },
  approval:  { label: 'Approval',  color: '#D97706' },
  condition: { label: 'Condition', color: '#7C3AED' },
  end:       { label: 'End',       color: '#16A34A' },
} as const

const NODE_W = 180
const NODE_H = 70
type NodeType = keyof typeof NODE_TYPES

interface FlowNode {
  id: string; type: NodeType; label: string; x: number; y: number
  isMandatory: boolean; checklist: string[]; approvalMode: 'any' | 'all'
}
interface FlowEdge { id: string; source: string; target: string; label?: string }

interface Props {
  orgSlug: string; orgId: string
  template: { id: string; name: string; nodes: object[]; edges: object[]; publishedAt: string | null }
}

const DEFAULT_NODE: FlowNode = {
  id: 'n1', type: 'stage', label: 'Start',
  x: 80, y: 100, isMandatory: true, checklist: [], approvalMode: 'any',
}

export function TemplateBuilderClient({ orgSlug, orgId, template }: Props) {
  const { dark } = useDark()
  const t = getTokens(dark)

  const [nodes, setNodes] = useState<FlowNode[]>(
    template.nodes.length > 0 ? template.nodes as FlowNode[] : [DEFAULT_NODE]
  )
  const [edges, setEdges] = useState<FlowEdge[]>(template.edges as FlowEdge[])
  const [selected, setSelected] = useState('')
  const [pan, setPan] = useState({ x: 60, y: 60 })
  const [zoom, setZoom] = useState(0.9)
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const viewportRef = useRef<HTMLDivElement>(null)

  const selectedNode = nodes.find(n => n.id === selected)

  const toCanvas = useCallback((e: React.MouseEvent) => {
    if (!viewportRef.current) return { x: 0, y: 0 }
    const r = viewportRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom }
  }, [pan, zoom])

  const onViewportMouseMove = (e: React.MouseEvent) => {
    const pt = toCanvas(e)
    if (drag) setNodes(ns => ns.map(n => n.id === drag.id ? { ...n, x: pt.x - drag.ox, y: pt.y - drag.oy } : n))
    else if (panning) setPan({ x: panning.startPanX + (e.clientX - panning.startX), y: panning.startPanY + (e.clientY - panning.startY) })
    else if (connectFrom) setMousePos(pt)
  }

  const onViewportMouseUp = () => { setDrag(null); setPanning(null); setConnectFrom(null); setMousePos(null) }

  const onViewportMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target === viewportRef.current || target.tagName === 'svg' || target.tagName === 'rect' || target.tagName === 'circle') {
      setSelected('')
      setPanning({ startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y })
    }
  }

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (!viewportRef.current) return
    const r = viewportRef.current.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    const delta = -e.deltaY * 0.001
    setZoom(z => {
      const newZoom = Math.max(0.3, Math.min(2, z * (1 + delta)))
      const k = newZoom / z
      setPan(p => ({ x: mx - (mx - p.x) * k, y: my - (my - p.y) * k }))
      return newZoom
    })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const nodeById = (id: string) => nodes.find(n => n.id === id)

  const edgePath = (s: FlowNode, tg: FlowNode) => {
    const sx = s.x + NODE_W, sy = s.y + NODE_H / 2
    const tx = tg.x, ty = tg.y + NODE_H / 2
    const dx = Math.max(40, (tx - sx) * 0.5)
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`
  }

  const finishConnect = (targetId: string) => {
    if (connectFrom && connectFrom !== targetId && !edges.some(e => e.source === connectFrom && e.target === targetId)) {
      setEdges(es => [...es, { id: `e${Date.now()}`, source: connectFrom, target: targetId }])
    }
    setConnectFrom(null); setMousePos(null)
  }

  const updateNode = (id: string, patch: Partial<FlowNode>) =>
    setNodes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n))

  const deleteNode = (id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.source !== id && e.target !== id))
    setSelected('')
  }

  async function handleSave(publish?: boolean) {
    setSaving(true); setSaveError('')
    try {
      const res = await fetch(`/api/templates/${orgId}/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes, edges,
          ...(publish && { publishedAt: new Date().toISOString() }),
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setSaveError('Save failed')
      }
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={[
          <Link key="tpl" href={`/${orgSlug}/templates`} style={{ color: 'inherit', textDecoration: 'none' }}>Templates</Link>,
          template.name,
        ]}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saved && <span style={{ fontSize: 12, color: t.green }}>Saved ✓</span>}
            {saveError && <span style={{ fontSize: 12, color: t.red }}>{saveError}</span>}
            <Btn size="sm" dark={dark} onClick={() => handleSave(false)} disabled={saving}>Save draft</Btn>
            <Btn size="sm" variant="primary" dark={dark} icon={Icons.play} onClick={() => handleSave(true)} disabled={saving}>
              {template.publishedAt ? 'Update & publish' : 'Publish'}
            </Btn>
          </div>
        }
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Node palette */}
        <div style={{ width: 190, flexShrink: 0, borderRight: `1px solid ${t.border}`, background: t.surface, padding: '10px 0', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 12px 8px' }}>Add node</div>
          {(Object.entries(NODE_TYPES) as [NodeType, { label: string; color: string }][]).map(([k, v]) => (
            <div key={k}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12.5 }}
              onMouseEnter={e => (e.currentTarget.style.background = t.surface2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => {
                const cx = (400 - pan.x) / zoom
                const cy = (200 + nodes.length * 20 - pan.y) / zoom
                const newNode: FlowNode = {
                  id: `n${Date.now()}`, type: k, label: v.label,
                  x: cx, y: cy, isMandatory: false, checklist: [], approvalMode: 'any',
                }
                setNodes(ns => [...ns, newNode])
                setSelected(newNode.id)
              }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, background: v.color + '20', color: v.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon d={k === 'stage' ? Icons.stage : k === 'approval' ? Icons.approval : k === 'condition' ? Icons.branch : Icons.stop} size={12} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: t.text }}>{v.label}</div>
                <div style={{ fontSize: 10, color: t.textSubtle }}>
                  {k === 'stage' ? 'work column' : k === 'approval' ? 'blocking gate' : k === 'condition' ? 'branch on field' : 'terminal'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={viewportRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: t.bg, cursor: drag || panning ? 'grabbing' : 'default' }}
          onMouseMove={onViewportMouseMove}
          onMouseUp={onViewportMouseUp}
          onMouseDown={onViewportMouseDown}
        >
          {/* Dot-grid background */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="fdots" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)} width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
                <circle cx={1} cy={1} r={0.8} fill={t.border} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#fdots)" />
          </svg>

          {/* Transformed canvas layer */}
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {/* Edges */}
            <svg style={{ position: 'absolute', inset: 0, width: 2000, height: 1000, pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                {Object.entries(NODE_TYPES).map(([k, v]) => (
                  <marker key={k} id={`arr-${k}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill={v.color} />
                  </marker>
                ))}
              </defs>
              {edges.map(edge => {
                const s = nodeById(edge.source)
                const tg = nodeById(edge.target)
                if (!s || !tg) return null
                const color = NODE_TYPES[s.type]?.color ?? '#71717A'
                return (
                  <path key={edge.id} d={edgePath(s, tg)} stroke={color} strokeWidth="1.5" fill="none" markerEnd={`url(#arr-${s.type})`} />
                )
              })}
              {connectFrom && mousePos && (() => {
                const src = nodeById(connectFrom)
                if (!src) return null
                return (
                  <line
                    x1={src.x + NODE_W} y1={src.y + NODE_H / 2}
                    x2={mousePos.x} y2={mousePos.y}
                    stroke={t.accent} strokeWidth="1.5" strokeDasharray="4 3"
                  />
                )
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const cfg = NODE_TYPES[node.type]
              const isSel = selected === node.id
              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute', left: node.x, top: node.y,
                    width: NODE_W, minHeight: NODE_H,
                    background: t.surface,
                    border: `2px solid ${isSel ? cfg.color : t.border}`,
                    borderRadius: node.type === 'end' ? 24 : 8,
                    padding: '8px 10px', cursor: 'grab', userSelect: 'none',
                    boxShadow: isSel ? `0 0 0 3px ${cfg.color}30` : t.shadow,
                  }}
                  onMouseDown={e => {
                    e.stopPropagation()
                    setSelected(node.id)
                    const pt = toCanvas(e)
                    setDrag({ id: node.id, ox: pt.x - node.x, oy: pt.y - node.y })
                  }}
                  onMouseUp={e => {
                    e.stopPropagation()
                    if (connectFrom) finishConnect(node.id)
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: cfg.color, marginBottom: 2 }}>
                    {cfg.label}{node.isMandatory ? ' ★' : ''}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{node.label}</div>
                  {/* Connect handle */}
                  <div
                    title="Drag to connect"
                    style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: cfg.color, border: `2px solid ${t.surface}`, cursor: 'crosshair', zIndex: 5 }}
                    onMouseDown={e => { e.stopPropagation(); setConnectFrom(node.id) }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Config panel */}
        <div style={{ width: 230, flexShrink: 0, borderLeft: `1px solid ${t.border}`, background: t.surface, padding: '10px 0', overflow: 'auto' }}>
          <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 14px 10px' }}>Node config</div>
          {!selectedNode ? (
            <div style={{ padding: '0 14px', fontSize: 12, color: t.textSubtle }}>Click a node to configure</div>
          ) : (
            <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Label */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>Label</div>
                <input
                  value={selectedNode.label}
                  onChange={e => updateNode(selectedNode.id, { label: e.target.value })}
                  style={{ width: '100%', fontSize: 12, padding: '5px 8px', background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 5, color: t.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {/* Mandatory toggle */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted }}>Mandatory</span>
                  <div
                    onClick={() => updateNode(selectedNode.id, { isMandatory: !selectedNode.isMandatory })}
                    style={{ width: 32, height: 17, borderRadius: 9, background: selectedNode.isMandatory ? t.accent : t.surface3, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: selectedNode.isMandatory ? 17 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              </div>
              {/* Approval mode (only for approval nodes) */}
              {selectedNode.type === 'approval' && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>Approval mode</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['any', 'all'] as const).map(mode => (
                      <button key={mode}
                        onClick={() => updateNode(selectedNode.id, { approvalMode: mode })}
                        style={{ flex: 1, padding: '4px 0', fontSize: 11, fontWeight: 600, background: selectedNode.approvalMode === mode ? t.accent : t.surface2, color: selectedNode.approvalMode === mode ? 'white' : t.textMuted, border: `1px solid ${selectedNode.approvalMode === mode ? t.accent : t.border}`, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {mode === 'any' ? 'Any approver' : 'All approvers'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Delete */}
              <div style={{ paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  style={{ fontSize: 11.5, color: t.red, cursor: 'pointer', background: 'none', border: `1px solid ${t.red}40`, borderRadius: 5, padding: '4px 10px', fontFamily: 'inherit' }}>
                  Delete node
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
