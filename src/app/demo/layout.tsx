'use client'

import React, { useState } from 'react'
import { getTokens } from '@/lib/tokens'
import { Sidebar } from '@/components/shell/Sidebar'
import { Icon, Icons } from '@/components/ui/Icon'
import { Btn } from '@/components/ui/Btn'
import type { Role } from '@/lib/data'

// DemoContext — theme + role shared across all demo pages
interface DemoCtx {
  dark: boolean
  role: Role
  setDark: (v: boolean) => void
  setRole: (v: Role) => void
}
export const DemoContext = React.createContext<DemoCtx>({
  dark: false, role: 'admin',
  setDark: () => {}, setRole: () => {},
})

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)
  const [role, setRole] = useState<Role>('admin')
  const t = getTokens(dark)

  return (
    <DemoContext.Provider value={{ dark, role, setDark, setRole }}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: t.bg, color: t.text, fontFamily: 'var(--font-sans)' }}>
        {/* Tweak bar */}
        <div style={{
          height: 36, background: t.surface, borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
          fontSize: 11.5, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.textSubtle }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'linear-gradient(135deg,#7C3AED,#14B8A6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 8, fontWeight: 800 }}>F</span>
            </div>
            <span style={{ fontWeight: 700, color: t.text }}>FlowDesk</span>
            <span style={{ color: t.border }}>·</span>
            <span>Design preview</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Role switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: t.textSubtle, fontSize: 10.5 }}>Role</span>
            {(['admin','manager','member'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  padding: '2px 8px', fontSize: 11, fontWeight: 500,
                  background: role === r ? t.accent : 'transparent',
                  color: role === r ? 'white' : t.textMuted,
                  border: `1px solid ${role === r ? t.accent : t.border}`,
                  borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >{r}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 16, background: t.border }} />

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            title={dark ? 'Switch to light' : 'Switch to dark'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', fontSize: 11, fontWeight: 500,
              background: dark ? t.accent + '20' : 'transparent',
              color: dark ? t.accent : t.textMuted,
              border: `1px solid ${dark ? t.accentBorder : t.border}`,
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Icon d={dark ? '🌙' : Icons.sparkle} size={12} />
            {dark ? 'Dark' : 'Light'}
          </button>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Sidebar role={role} page="dashboard" dark={dark} />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: t.bg }}>
            {children}
          </main>
        </div>
      </div>
    </DemoContext.Provider>
  )
}
