import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { createAuditEntry } from '@/lib/audit'

function shallowDeepEqual(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]))
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 'org-slug': slug } = await params
  const org = await db.organization.findUnique({
    where: { slug },
    include: { tenantConfig: true },
  })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ org })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 'org-slug': slug } = await params
  const org = await db.organization.findUnique({
    where: { slug },
    include: { tenantConfig: true },
  })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { plan, seatLimit, featureFlags, ssoConfig, branding } = body

  const before = org.tenantConfig
  const updated = await db.tenantConfig.upsert({
    where: { orgId: org.id },
    create: { orgId: org.id, plan, seatLimit, featureFlags, ssoConfig, branding },
    update: { plan, seatLimit, featureFlags, ssoConfig, branding },
  })

  const ip = req.headers.get('x-forwarded-for') ?? undefined

  // Compare post-upsert values to avoid false negatives on first creation
  if (updated.plan !== before?.plan || updated.seatLimit !== before?.seatLimit) {
    await createAuditEntry({
      orgId: org.id,
      actorId: user.id,
      entityType: 'TENANT_CONFIG',
      entityId: org.id,
      entityLabel: org.name,
      action: 'PLAN_CHANGED',
      before: before ? { plan: before.plan, seatLimit: before.seatLimit } : null,
      after: { plan: updated.plan, seatLimit: updated.seatLimit },
      ipAddress: ip,
    })
  }
  if (!shallowDeepEqual(updated.featureFlags as Record<string, unknown>, before?.featureFlags as Record<string, unknown>)) {
    await createAuditEntry({
      orgId: org.id,
      actorId: user.id,
      entityType: 'TENANT_CONFIG',
      entityId: org.id,
      entityLabel: org.name,
      action: 'FEATURE_FLAG_CHANGED',
      before: before ? { featureFlags: before.featureFlags } : null,
      after: { featureFlags: updated.featureFlags },
      ipAddress: ip,
    })
  }
  if (!shallowDeepEqual(updated.ssoConfig as Record<string, unknown>, before?.ssoConfig as Record<string, unknown>)) {
    await createAuditEntry({
      orgId: org.id,
      actorId: user.id,
      entityType: 'TENANT_CONFIG',
      entityId: org.id,
      entityLabel: org.name,
      action: 'SSO_CONFIG_CHANGED',
      before: before ? { ssoConfig: before.ssoConfig } : null,
      after: { ssoConfig: updated.ssoConfig },
      ipAddress: ip,
    })
  }

  return NextResponse.json({ config: updated })
}
