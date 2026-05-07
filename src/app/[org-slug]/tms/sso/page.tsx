import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { getTenantConfig } from '@/lib/tenant-config'
import { redirect } from 'next/navigation'

export default async function TmsSsoPage({ params }: { params: Promise<{ 'org-slug': string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership || membership.role !== 'ADMIN') redirect(`/${slug}`)
  const config = await getTenantConfig(membership.orgId)
  const sso = config.ssoConfig as Record<string, unknown>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-100 mb-1">SSO Configuration</h1>
      <p className="text-slate-500 text-sm mb-6">Managed by your FlowDesk account team. Contact support to change.</p>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        {(['provider', 'entityId', 'ssoUrl'] as const).map((field) => (
          <div key={field}>
            <p className="text-slate-500 text-xs uppercase mb-1">{field}</p>
            <p className="text-slate-300 font-mono text-sm">{String(sso[field] ?? '—')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
