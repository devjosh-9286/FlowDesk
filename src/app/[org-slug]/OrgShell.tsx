'use client'
import { getTokens } from '@/lib/tokens'
import { useDark } from '@/components/shell/DarkProvider'
import { OrgSidebar } from '@/components/shell/OrgSidebar'

interface Props {
  children: React.ReactNode
  orgName: string; orgSlug: string; plan: string; memberCount: number
  role: string; userName: string; userEmail: string; isAdmin: boolean
}

export function OrgShell({ children, ...sidebarProps }: Props) {
  const { dark } = useDark()
  const t = getTokens(dark)
  return (
    <div style={{ height: '100vh', display: 'flex', background: t.bg, color: t.text, fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      <OrgSidebar {...sidebarProps} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: t.bg }}>
        {children}
      </main>
    </div>
  )
}
