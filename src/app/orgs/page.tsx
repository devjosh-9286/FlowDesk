import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { CreateOrgForm } from './_CreateOrgForm'

export default async function OrgsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const memberships = await db.orgMembership.findMany({
    where: { userId: session.user.id },
    include: {
      org: {
        include: {
          tenantConfig: true,
          _count: { select: { memberships: true } },
        },
      },
    },
  })

  // Auto-redirect if only one org
  if (memberships.length === 1) redirect(`/${memberships[0].org.slug}`)

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#7C3AED,#14B8A6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>F</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#F4F4F5' }}>FlowDesk</span>
          </div>
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 8 }}>Choose a workspace</p>
        </div>

        {/* Org list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {memberships.map(m => {
            const initials = m.org.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
            return (
              <Link key={m.org.id} href={`/${m.org.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#121217', border: '1px solid #26262E', borderRadius: 10,
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#14B8A6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#F4F4F5' }}>{m.org.name}</div>
                    <div style={{ fontSize: 11, color: '#71717A', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {m.org.tenantConfig?.plan ?? 'free'} · {m.org._count.memberships} members · {m.role.toLowerCase()}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            )
          })}
        </div>

        {memberships.length === 0 && (
          <p style={{ textAlign: 'center', color: '#71717A', fontSize: 13, marginBottom: 16 }}>You don&apos;t belong to any workspace yet.</p>
        )}

        <CreateOrgForm />
      </div>
    </div>
  )
}
