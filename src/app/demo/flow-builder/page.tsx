'use client'

import React, { useContext, useState, useRef, useCallback, useEffect } from 'react'
import { DemoContext } from '../layout'
import { getTokens } from '@/lib/tokens'
import { AppHeader } from '@/components/shell/AppHeader'
import { Btn } from '@/components/ui/Btn'
import { Icon, Icons } from '@/components/ui/Icon'
import { Pill } from '@/components/ui/Pill'
import { FLOW_NODES, FLOW_EDGES } from '@/lib/data'

// ─── Node type config ───────────────────────────────────────────
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
  id: string
  type: NodeType
  label: string
  x: number
  y: number
  isMandatory: boolean
  checklist: string[]
  approvalMode: 'any' | 'all'
}

interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
}

// ─── Checklist editor ───────────────────────────────────────────
function ChecklistEditor({ items, onChange, dark }: { items: string[]; onChange: (v: string[]) => void; dark: boolean }) {
  const t = getTokens(dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, border: `1px solid ${t.border}`, borderRadius: 2, flexShrink: 0 }} />
          <input
            value={item}
            onChange={e => { const next = [...items]; next[i] = e.target.value; onChange(next) }}
            style={{ flex: 1, fontSize: 11, background: 'transparent', border: 'none', color: t.text, fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSubtle, lineHeight: 1, padding: 2 }}>×</button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ''])}
        style={{ fontSize: 11, color: t.textSubtle, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', fontFamily: 'inherit', padding: '2px 0' }}
      >+ Add item</button>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────
export default function FlowBuilderPage() {
  const { dark } = useContext(DemoContext)
  const t = getTokens(dark)

  const [nodes, setNodes] = useState<FlowNode[]>(FLOW_NODES as FlowNode[])
  const [edges, setEdges] = useState<FlowEdge[]>(FLOW_EDGES)
  const [selected, setSelected] = useState<string>('n4')
  const [pan, setPan] = useState({ x: 60, y: 60 })
  const [zoom, setZoom] = useState(0.9)
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const selectedNode = nodes.find(n => n.id === selected)

  const toCanvas = useCallback((e: React.MouseEvent) => {
    if (!viewportRef.current) return { x: 0, y: 0 }
    const r = viewportRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom }
  }, [pan, zoom])

  const onViewportMouseMove = (e: React.MouseEvent) => {
    const pt = toCanvas(e)
    if (drag) {
      setNodes(ns => ns.map(n => n.id === drag.id ? { ...n, x: pt.x - drag.ox, y: pt.y - drag.oy } : n))
    } else if (panning) {
      setPan({ x: panning.startPanX + (e.clientX - panning.startX), y: panning.startPanY + (e.clientY - panning.startY) })
    } else if (connectFrom) {
      setMousePos(pt)
    }
  }

  const onViewportMouseUp = () => { setDrag(null); setPanning(null); setConnectFrom(null); setMousePos(null) }

  const onViewportMouseDown = (e: React.MouseEvent) => {
    if (e.target === viewportRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setSelected('')
      setPanning({ startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y })
    }
  }

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (!viewportRef.current) return
    const r = viewportRef.current.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
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

  const fitView = () => { setPan({ x: 60, y: 60 }); setZoom(0.9) }

  return (
    <>
      <AppHeader
        dark={dark}
        crumbs={['Larkvale', 'Templates', 'Content Publishing']}
        right={
          <>
            <Pill dark={dark}>v3 · draft</Pill>
            <Btn size="sm" dark={dark} icon={Icons.undo} />
            <Btn size="sm" dark={dark} icon={Icons.redo} />
            <div style={{ width: 1, height: 18, background: t.border, margin: '0 2px' }} />
            <Btn size="sm" dark={dark}>Preview</Btn>
            <Btn size="sm" variant="secondary" dark={dark}>Save draft</Btn>
            <Btn size="sm" variant="primary" dark={dark} icon={Icons.play}>Publish v3</Btn>
          </>
        }
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Node palette */}
        <div style={{ width: 190, flexShrink: 0, borderRight: `1px solid ${t.border}`, background: t.surface, padding: '10px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 12px 8px' }}>Nodes</div>
          {(Object.entries(NODE_TYPES) as [NodeType, typeof NODE_TYPES[NodeType]][]).map(([k, v]) => (
            <div
              key={k}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'grab', fontSize: 12.5 }}
              onMouseEnter={e => e.currentTarget.style.background = t.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onMouseDown={() => {
                // Add node to canvas near center
                const cx = (400 - pan.x) / zoom
                const cy = (200 - pan.y) / zoom
                const newNode: FlowNode = { id: `n${Date.now()}`, type: k, label: v.label, x: cx, y: cy, isMandatory: false, checklist: [], approvalMode: 'any' }
                setNodes(ns => [...ns, newNode])
                setSelected(newNode.id)
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 4, background: v.color + '1F', color: v.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={k === 'stage' ? Icons.stage : k === 'approval' ? Icons.approval : k === 'condition' ? Icons.branch : Icons.stop} size={12} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: t.text }}>{v.label}</div>
                <div style={{ fontSize: 10, color: t.textSubtle }}>
                  {k === 'stage' ? 'work column' : k === 'approval' ? 'blocking gate' : k === 'condition' ? 'branch on field' : 'terminal'}
                </div>
              </div>
            </div>
          ))}

          {/* Lint panel */}
          <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '16px 12px 8px' }}>Lint</div>
          <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { ok: true,  msg: 'All stages connected' },
              { ok: true,  msg: 'End node reachable' },
              { ok: false, msg: 'Condition node missing default branch' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11 }}>
                <Icon d={item.ok ? Icons.check : Icons.x} size={12} style={{ color: item.ok ? t.green : t.amber, marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: item.ok ? t.textMuted : t.amber }}>{item.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={viewportRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: t.bg, cursor: drag ? 'grabbing' : panning ? 'grabbing' : 'default' }}
          onMouseMove={onViewportMouseMove}
          onMouseUp={onViewportMouseUp}
          onMouseDown={onViewportMouseDown}
        >
          {/* Dot grid */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="dots" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)} width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
                <circle cx={1} cy={1} r={0.8} fill={t.border} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>

          {/* Canvas toolbar */}
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: '5px 12px', display: 'flex', gap: 10, zIndex: 10, boxShadow: t.shadow }}>
            {[['Undo', Icons.undo], ['Redo', Icons.redo], ['Fit', Icons.fit]].map(([label, icon]) => (
              <button key={label as string} onClick={label === 'Fit' ? fitView : undefined} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: t.textMuted, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon d={icon as string} size={12} />{label as string}
              </button>
            ))}
            <div style={{ width: 1, height: 14, background: t.border }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: t.textSubtle }}>{Math.round(zoom * 100)}%</span>
          </div>

          {/* Graph */}
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {/* SVG edges */}
            <svg style={{ position: 'absolute', inset: 0, width: 1800, height: 600, pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                {Object.entries(NODE_TYPES).map(([k, v]) => (
                  <marker key={k} id={`arrow-${k}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill={v.color} />
                  </marker>
                ))}
              </defs>
              {edges.map(e => {
                const s = nodeById(e.source), tg = nodeById(e.target)
                if (!s || !tg) return null
                const color = NODE_TYPES[s.type]?.color ?? '#71717A'
                const midX = (s.x + NODE_W / 2 + tg.x + NODE_W / 2) / 2
                const midY = (s.y + NODE_H / 2 + tg.y + NODE_H / 2) / 2
                return (
                  <g key={e.id}>
                    <path d={edgePath(s, tg)} stroke={color} strokeWidth="1.5" fill="none" markerEnd={`url(#arrow-${s.type})`} />
                    {e.label && (
                      <text x={midX} y={midY - 4} textAnchor="middle" fontSize="10" fill={color} fontFamily="var(--font-mono)">{e.label}</text>
                    )}
                  </g>
                )
              })}
              {/* Live connect line */}
              {connectFrom && mousePos && (() => {
                const src = nodeById(connectFrom)
                if (!src) return null
                return <line x1={src.x + NODE_W} y1={src.y + NODE_H / 2} x2={mousePos.x} y2={mousePos.y} stroke={t.accent} strokeWidth="1.5" strokeDasharray="4 3" />
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const cfg = NODE_TYPES[node.type]
              const isSelected = selected === node.id
              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: node.x,
                    top: node.y,
                    width: NODE_W,
                    minHeight: NODE_H,
                    background: t.surface,
                    border: `2px solid ${isSelected ? cfg.color : t.border}`,
                    borderRadius: node.type === 'end' ? 24 : 8,
                    padding: '8px 10px',
                    cursor: 'grab',
                    boxShadow: isSelected ? `0 0 0 3px ${cfg.color}30` : t.shadow,
                    userSelect: 'none',
                  }}
                  onMouseDown={e => {
                    e.stopPropagation()
                    setSelected(node.id)
                    const pt = toCanvas(e)
                    setDrag({ id: node.id, ox: pt.x - node.x, oy: pt.y - node.y })
                  }}
                  onMouseUp={e => { e.stopPropagation(); if (connectFrom) finishConnect(node.id) }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: cfg.color, marginBottom: 2 }}>
                    {cfg.label}{node.isMandatory ? ' ★' : ''}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{node.label}</div>
                  {node.checklist.length > 0 && (
                    <div style={{ fontSize: 9.5, color: t.textSubtle, marginTop: 3 }}>{node.checklist.length} checklist items</div>
                  )}

                  {/* Connect handle (right side) */}
                  <div
                    style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: cfg.color, border: `2px solid ${t.surface}`, cursor: 'crosshair', zIndex: 5 }}
                    onMouseDown={e => { e.stopPropagation(); setConnectFrom(node.id) }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Node config panel */}
        <div style={{ width: 230, flexShrink: 0, borderLeft: `1px solid ${t.border}`, background: t.surface, padding: '10px 0', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 14px 10px' }}>Node config</div>

          {!selectedNode ? (
            <div style={{ padding: '0 14px', fontSize: 12, color: t.textSubtle }}>Click a node to configure it</div>
          ) : (
            <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Node type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: NODE_TYPES[selectedNode.type].color }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: NODE_TYPES[selectedNode.type].color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {NODE_TYPES[selectedNode.type].label}
                </span>
              </div>

              {/* Label */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>Label</div>
                <input
                  value={selectedNode.label}
                  onChange={e => updateNode(selectedNode.id, { label: e.target.value })}
                  style={{
                    width: '100%', fontSize: 12, padding: '5px 8px',
                    background: t.surface2, border: `1px solid ${t.border}`,
                    borderRadius: 5, color: t.text, fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>

              {/* Mandatory toggle */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>Mandatory</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, color: t.textMuted }}>Enforce completion</span>
                  <div
                    onClick={() => updateNode(selectedNode.id, { isMandatory: !selectedNode.isMandatory })}
                    style={{
                      width: 32, height: 17, borderRadius: 9,
                      background: selectedNode.isMandatory ? t.accent : t.surface3,
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 13, height: 13, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 2, left: selectedNode.isMandatory ? 17 : 2,
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              </div>

              {/* Approval mode (approval nodes only) */}
              {selectedNode.type === 'approval' && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>Approval mode</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['any', 'all'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateNode(selectedNode.id, { approvalMode: mode })}
                        style={{
                          flex: 1, padding: '4px 0', fontSize: 11, fontWeight: 600,
                          background: selectedNode.approvalMode === mode ? t.accent : t.surface2,
                          color: selectedNode.approvalMode === mode ? 'white' : t.textMuted,
                          border: `1px solid ${selectedNode.approvalMode === mode ? t.accent : t.border}`,
                          borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >{mode === 'any' ? 'Any approver' : 'All approvers'}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: t.textSubtle, marginTop: 4 }}>
                    {selectedNode.approvalMode === 'any' ? 'First approval advances the stage' : 'Every approver must approve'}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>Checklist</div>
                <ChecklistEditor
                  items={selectedNode.checklist}
                  onChange={items => updateNode(selectedNode.id, { checklist: items })}
                  dark={dark}
                />
              </div>

              {/* Delete node */}
              <div style={{ paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
                <Btn
                  size="xs"
                  variant="danger"
                  dark={dark}
                  icon={Icons.x}
                  onClick={() => { setNodes(ns => ns.filter(n => n.id !== selectedNode.id)); setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id)); setSelected('') }}
                >Delete node</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
