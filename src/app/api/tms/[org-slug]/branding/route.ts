import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { createAuditEntry } from '@/lib/audit'
import { isFeatureEnabled, getTenantConfig } from '@/lib/tenant-config'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const config = await getTenantConfig(membership.orgId)
  return NextResponse.json({ branding: config.branding })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const config = await getTenantConfig(membership.orgId)
  if (!isFeatureEnabled(config, 'customBranding')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  let branding: Record<string, unknown>
  try {
    const body = await req.json()
    branding = body?.branding
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!branding || typeof branding !== 'object') {
    return NextResponse.json({ error: 'branding object required' }, { status: 400 })
  }

  const updated = await db.tenantConfig.update({
    where: { orgId: membership.orgId },
    data: { branding },
  })

  await createAuditEntry({
    orgId: membership.orgId,
    actorId: session.user.id,
    entityType: 'TENANT_CONFIG',
    entityId: membership.orgId,
    entityLabel: slug,
    action: 'BRANDING_CHANGED',
    before: { branding: config.branding },
    after: { branding: updated.branding },
  })

  return NextResponse.json({ ok: true })
}
