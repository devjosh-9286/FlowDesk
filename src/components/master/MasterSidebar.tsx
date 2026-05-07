'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { section: 'Overview', items: [{ label: '📊 Dashboard', href: '/master' }] },
  {
    section: 'Tenants',
    items: [
      { label: '🏢 All Tenants', href: '/master/tenants' },
    ],
  },
  {
    section: 'Platform',
    items: [
      { label: '🛡 Admins', href: '/master/admins' },
      { label: '📋 Audit Log', href: '/master/audit' },
    ],
  },
]

export function MasterSidebar({ actorEmail }: { actorEmail: string }) {
  const pathname = usePathname()
  return (
    <aside className="w-52 flex-shrink-0 bg-slate-950 flex flex-col border-r border-slate-800">
      <div className="px-4 py-4 border-b border-slate-800">
        <p className="text-indigo-400 font-bold text-sm">⬡ FlowDesk</p>
        <p className="text-slate-500 text-xs">Platform Admin</p>
      </div>
      <nav className="flex-1 py-2">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="px-4 pt-3 pb-1 text-slate-600 text-[10px] uppercase tracking-widest">{section}</p>
            {items.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-100',
                  (href === '/master' ? pathname === href : pathname.startsWith(href)) &&
                    'bg-slate-800 text-slate-100 border-l-2 border-indigo-400'
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
        {actorEmail}
      </div>
    </aside>
  )
}
