'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { getTokens } from '@/lib/tokens'
import { Icon, Icons } from '@/components/ui/Icon'
import { useDark } from '@/components/shell/DarkProvider'

interface OrgSidebarProps {
  orgName: string
  orgSlug: string
  plan: string
  memberCount: number
  role: string
  userName: string
  userEmail: string
  isAdmin: boolean
}

export function OrgSidebar({ orgName, orgSlug, plan, memberCount, role, userName, userEmail, isAdmin }: OrgSidebarProps) {
  const { dark, setDark } = useDark()
  const t = getTokens(dark)
  const pathname = usePathname()

  const initials = orgName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const mainItems = [
    { label: 'Dashboard',  icon: Icons.home,     href: `/${orgSlug}` },
    { label: 'Projects',   icon: Icons.folder,   href: `/${orgSlug}/projects` },
    { label: 'Approvals',  icon: Icons.approval, href: `/${orgSlug}/approvals` },
  ]
  const adminItems = [
    { label: 'Flow templates', icon: Icons.flow,     href: `/${orgSlug}/templates` },
    { label: 'Settings',       icon: Icons.settings, href: `/${orgSlug}/tms` },
  ]

  function isActive(href: string) {
    if (href === `/${orgSlug}`) return pathname === `/${orgSlug}`
    return pathname.startsWith(href)
  }

  const navStyle = (href: string) => ({
    display: 'flex' as const, alignItems: 'center' as const, gap: 8,
    padding: '5px 8px', fontSize: 12.5,
    fontWeight: isActive(href) ? 600 : 500,
    color: isActive(href) ? t.text : t.textMuted,
    background: isActive(href) ? t.surface3 : 'transparent',
    borderRadius: 5, textDecoration: 'none' as const,
  })

  return (
    <aside style={{ width: 220, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: t.surface2, borderRight: `1px solid ${t.border}` }}>
      {/* Org header */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#7C3AED,#14B8A6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orgName}</div>
          <div style={{ fontSize: 10, color: t.textSubtle, fontFamily: 'var(--font-mono)' }}>{plan} · {memberCount} members</div>
        </div>
        <Link href="/orgs" title="Switch workspace" style={{ color: t.textSubtle, lineHeight: 1, display: 'flex' }}>
          <Icon d={Icons.chevDown} size={12} />
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ padding: '6px 8px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {mainItems.map(item => (
          <Link key={item.href} href={item.href} style={navStyle(item.href)}>
            <Icon d={item.icon} size={14} />
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textSubtle, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 8px 4px' }}>Admin</div>
            {adminItems.map(item => (
              <Link key={item.href} href={item.href} style={navStyle(item.href)}>
                <Icon d={item.icon} size={14} />
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Bottom: dark toggle + user */}
      <div style={{ borderTop: `1px solid ${t.border}` }}>
        <div style={{ padding: '6px 12px' }}>
          <button onClick={() => setDark(!dark)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSubtle, fontSize: 11, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
            <Icon d={Icons.sparkle} size={12} />{dark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#7C3AED30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#7C3AED', flexShrink: 0 }}>
            {(userName || userEmail).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || userEmail}</div>
            <div style={{ fontSize: 10, color: t.textSubtle, textTransform: 'capitalize' }}>{role.toLowerCase()}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSubtle, padding: 2, display: 'flex' }}>
            <Icon d={Icons.x} size={12} />
          </button>
        </div>
      </div>
    </aside>
  )
}
