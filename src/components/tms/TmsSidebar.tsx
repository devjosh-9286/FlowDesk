'use client'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function TmsSidebar() {
  const pathname = usePathname()
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const base = `/${slug}/tms`

  const NAV = [
    { section: 'Overview', items: [{ label: '📊 Dashboard', href: base }] },
    { section: 'Access', items: [
      { label: '👥 Users', href: `${base}/users` },
      { label: '🎭 Roles', href: `${base}/roles` },
    ]},
    { section: 'Identity', items: [
      { label: '🔐 SSO', href: `${base}/sso` },
      { label: '🎨 Branding', href: `${base}/branding` },
    ]},
    { section: 'Reporting', items: [
      { label: '📋 Audit Log', href: `${base}/audit` },
      { label: '💳 Billing', href: `${base}/billing` },
    ]},
  ]

  return (
    <aside className="w-52 flex-shrink-0 bg-slate-950 flex flex-col border-r border-slate-800">
      <div className="px-4 py-4 border-b border-slate-800">
        <p className="text-slate-100 font-bold text-sm">Admin Portal</p>
        <p className="text-emerald-400 text-xs">{slug}</p>
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
                  (href === base ? pathname === href : pathname.startsWith(href)) &&
                    'bg-slate-800 text-slate-100 border-l-2 border-emerald-400'
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <Link href={`/${slug}`} className="px-4 py-3 border-t border-slate-800 text-slate-500 text-xs hover:text-slate-300">
        ← Back to Workspace
      </Link>
    </aside>
  )
}
