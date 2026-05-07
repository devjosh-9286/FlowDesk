import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createAuditEntry } from '@/lib/audit'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, userId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const actorMembership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!actorMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (actorMembership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const target = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.orgMembership.delete({
    where: { orgId_userId: { orgId, userId } },
  })

  const ip = req.headers.get('x-forwarded-for') ?? undefined
  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'ORG_MEMBERSHIP',
    entityId: target.id,
    entityLabel: userId,
    action: 'DELETE',
    before: { userId, role: target.role, departmentId: target.departmentId },
    ipAddress: ip,
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, userId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const actorMembership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!actorMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (actorMembership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const target = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { role } = body

  const before = { role: target.role }
  const updated = await db.orgMembership.update({
    where: { orgId_userId: { orgId, userId } },
    data: { role },
  })
  const after = { role: updated.role }

  const ip = req.headers.get('x-forwarded-for') ?? undefined
  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'ORG_MEMBERSHIP',
    entityId: target.id,
    entityLabel: userId,
    action: 'ROLE_CHANGED',
    before,
    after,
    ipAddress: ip,
  })

  return NextResponse.json({ member: updated })
}
