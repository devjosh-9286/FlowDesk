import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { createAuditEntry } from '@/lib/audit'

async function requireAdmin(userId: string, orgSlug: string) {
  const membership = await getOrgMembership(userId, orgSlug)
  if (!membership || membership.role !== 'ADMIN') return null
  return membership
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { 'org-slug': slug } = await params
  const membership = await requireAdmin(session.user.id, slug)
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await db.orgMembership.findMany({
    where: { orgId: membership.orgId },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      department: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json({ members })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { 'org-slug': slug } = await params
  const membership = await requireAdmin(session.user.id, slug)
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let userId: string
  try {
    const body = await req.json()
    userId = body?.userId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  const target = await db.orgMembership.findFirst({
    where: { orgId: membership.orgId, userId },
    include: { user: true },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.orgMembership.delete({ where: { orgId_userId: { orgId: membership.orgId, userId } } })
  await createAuditEntry({
    orgId: membership.orgId,
    actorId: session.user.id,
    entityType: 'ORG_MEMBERSHIP',
    entityId: userId,
    entityLabel: target.user.email ?? userId,
    action: 'DELETE',
    before: { role: target.role, userId },
    after: null,
  })
  return NextResponse.json({ ok: true })
}
