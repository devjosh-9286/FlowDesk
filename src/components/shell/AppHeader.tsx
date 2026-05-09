'use client'

import React from 'react'
import { getTokens } from '@/lib/tokens'
import { Icon, Icons } from '@/components/ui/Icon'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode | string
  count?: number
}

interface AppHeaderProps {
  crumbs: (string | React.ReactNode)[]
  right?: React.ReactNode
  dark: boolean
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (id: string) => void
}

export function AppHeader({ crumbs, right, dark, tabs, activeTab, onTabChange }: AppHeaderProps) {
  const t = getTokens(dark)
  return (
    <header style={{ borderBottom: `1px solid ${t.border}`, background: t.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 10, minHeight: 42 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, flex: 1, minWidth: 0 }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon d={Icons.chevRight} size={11} style={{ color: t.textSubtle }} />}
              <span style={{
                color: i === crumbs.length - 1 ? t.text : t.textMuted,
                fontWeight: i === crumbs.length - 1 ? 600 : 500,
                whiteSpace: 'nowrap',
              }}>{c}</span>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>
      </div>

      {tabs && (
        <div style={{ display: 'flex', gap: 0, padding: '0 14px', borderTop: `1px solid ${t.border}` }}>
          {tabs.map(tab => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                style={{
                  padding: '8px 10px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? t.text : t.textMuted,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${active ? t.accent : 'transparent'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: -1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {tab.icon && <Icon d={tab.icon} size={12} />}
                {tab.label}
                {tab.count != null && (
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    padding: '0 4px',
                    borderRadius: 3,
                    background: active ? t.accentSoft : t.surface3,
                    color: active ? t.accent : t.textSubtle,
                  }}>{tab.count}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </header>
  )
}
