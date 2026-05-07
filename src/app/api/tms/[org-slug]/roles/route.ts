import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { createAuditEntry } from '@/lib/audit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let userId: string, role: string
  try {
    const body = await req.json()
    userId = body?.userId
    role = body?.role
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!userId || !role || !['ADMIN', 'MANAGER', 'MEMBER'].includes(role)) {
    return NextResponse.json({ error: 'userId and valid role required' }, { status: 400 })
  }

  const target = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId: membership.orgId, userId } },
    include: { user: { select: { email: true } } },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const before = { role: target.role }
  await db.orgMembership.update({
    where: { orgId_userId: { orgId: membership.orgId, userId } },
    data: { role: role as 'ADMIN' | 'MANAGER' | 'MEMBER' },
  })

  await createAuditEntry({
    orgId: membership.orgId,
    actorId: session.user.id,
    entityType: 'ORG_MEMBERSHIP',
    entityId: userId,
    entityLabel: target.user.email ?? userId,
    action: 'ROLE_CHANGED',
    before,
    after: { role },
  })

  return NextResponse.json({ ok: true })
}
