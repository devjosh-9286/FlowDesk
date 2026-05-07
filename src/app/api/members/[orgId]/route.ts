import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createAuditEntry } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await db.orgMembership.findMany({ where: { orgId } })
  return NextResponse.json({ members })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (membership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, role, departmentId } = body

  const newMember = await db.orgMembership.create({
    data: {
      orgId,
      userId,
      role: role ?? 'MEMBER',
      departmentId: departmentId ?? null,
    },
  })

  const ip = req.headers.get('x-forwarded-for') ?? undefined
  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'ORG_MEMBERSHIP',
    entityId: newMember.id,
    entityLabel: userId,
    action: 'CREATE',
    after: { userId, role: newMember.role, departmentId: newMember.departmentId },
    ipAddress: ip,
  })

  return NextResponse.json({ member: newMember }, { status: 201 })
}
