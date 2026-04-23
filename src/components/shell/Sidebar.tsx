'use client'

import React from 'react'
import Link from 'next/link'
import { getTokens } from '@/lib/tokens'
import { Icon, Icons } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import type { Role } from '@/lib/data'

type Page = 'dashboard' | 'projects' | 'kanban' | 'tasks' | 'approvals' | 'notifs' | 'builder' | 'templates' | 'people' | 'settings'

interface SidebarProps {
  role: Role
  page: Page
  dark: boolean
  onPageChange?: (page: Page) => void
}

interface NavItemDef {
  id: Page
  label: string
  icon: React.ReactNode | string
  roles: Role[]
  count?: number
  href: string
}

const ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard',     icon: Icons.home,     roles: ['admin','manager','member'], href: '/demo/dashboard' },
  { id: 'projects',  label: 'Projects',      icon: Icons.folder,   roles: ['admin','manager','member'], href: '/demo/dashboard', count: 12 },
  { id: 'kanban',    label: 'Board',         icon: Icons.tasks,    roles: ['admin','manager','member'], href: '/demo/kanban' },
  { id: 'tasks',     label: 'My tasks',      icon: Icons.check,    roles: ['admin','manager','member'], href: '/demo/dashboard', count: 7 },
  { id: 'approvals', label: 'Approvals',     icon: Icons.approval, roles: ['admin','manager'],          href: '/demo/dashboard', count: 3 },
  { id: 'notifs',    label: 'Notifications', icon: Icons.bell,     roles: ['admin','manager','member'], href: '/demo/dashboard', count: 2 },
]

const ADMIN_ITEMS: NavItemDef[] = [
  { id: 'builder',   label: 'Flow builder', icon: Icons.flow,     roles: ['admin'], href: '/demo/flow-builder' },
  { id: 'templates', label: 'Templates',    icon: Icons.stage,    roles: ['admin'], href: '/demo/flow-builder' },
  { id: 'people',    label: 'People',       icon: Icons.users,    roles: ['admin'], href: '/demo/dashboard' },
  { id: 'settings',  label: 'Settings',     icon: Icons.settings, roles: ['admin'], href: '/demo/dashboard' },
]

const PINNED = [
  { label: 'Q2 editorial calendar', color: '#7C3AED' },
  { label: 'Homepage redesign',     color: '#14B8A6' },
  { label: 'Brand voice RFC',       color: '#D97706' },
]

export function Sidebar({ role, page, dark, onPageChange }: SidebarProps) {
  const t = getTokens(dark)

  function NavItem({ it }: { it: NavItemDef }) {
    const isActive = page === it.id
    return (
      <Link
        href={it.href}
        onClick={() => onPageChange?.(it.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '5px 8px',
          fontSize: 12.5,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? t.text : t.textMuted,
          background: isActive ? t.surface3 : 'transparent',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          transition: 'background 0.1s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.surface2 }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        <Icon d={it.icon} size={14} />
        <span style={{ flex: 1 }}>{it.label}</span>
        {it.count != null && (
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', color: t.textSubtle, padding: '0 4px' }}>
            {it.count}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: t.surface2,
        borderRight: `1px solid ${t.border}`,
        fontSize: 12.5,
      }}
    >
      {/* Org switcher */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: `linear-gradient(135deg, #7C3AED, #14B8A6)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 11,
        }}>LV</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, lineHeight: 1.2 }}>Larkvale Media</div>
          <div style={{ fontSize: 10, color: t.textSubtle, fontFamily: 'var(--font-mono)' }}>pro · 48 seats</div>
        </div>
        <Icon d={Icons.chevDown} size={12} style={{ color: t.textSubtle }} />
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', height: 26,
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 5, color: t.textSubtle, fontSize: 11.5,
        }}>
          <Icon d={Icons.search} size={12} />
          <span style={{ flex: 1 }}>Search</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>⌘K</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '2px 8px', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {ITEMS.filter(i => i.roles.includes(role)).map(it => <NavItem key={it.id} it={it} />)}
        </div>

        {role === 'admin' && (
          <>
            <div style={{
              padding: '14px 8px 6px',
              fontSize: 10, fontWeight: 600, color: t.textSubtle,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Admin</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {ADMIN_ITEMS.map(it => <NavItem key={it.id} it={it} />)}
            </div>
          </>
        )}

        <div style={{
          padding: '14px 8px 6px',
          fontSize: 10, fontWeight: 600, color: t.textSubtle,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Pinned</span>
          <Icon d={Icons.plus} size={11} style={{ cursor: 'pointer' }} />
        </div>
        {PINNED.map((p, i) => (
          <button key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '5px 8px',
            fontSize: 12, color: t.textMuted,
            background: 'transparent', border: 'none', borderRadius: 5,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
          </button>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '8px 10px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar user="u1" size={22} dark={dark} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: t.text, lineHeight: 1.2 }}>Maya Okafor</div>
          <div style={{ fontSize: 10, color: t.textSubtle, textTransform: 'capitalize' }}>{role}</div>
        </div>
        <Icon d={Icons.settings} size={13} style={{ color: t.textSubtle, cursor: 'pointer' }} />
      </div>
    </aside>
  )
}
