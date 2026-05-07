import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { createAuditEntry } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admins = await db.user.findMany({
    where: { systemRole: 'SUPERADMIN' },
    select: { id: true, name: true, email: true, createdAt: true },
  })
  return NextResponse.json({ admins })
}

export async function POST(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json()
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  const updated = await db.user.update({
    where: { id: userId },
    data: { systemRole: 'SUPERADMIN' },
  })
  await createAuditEntry({
    orgId: null,
    actorId: user.id,
    entityType: 'SUPERADMIN',
    entityId: userId,
    entityLabel: updated.email ?? userId,
    action: 'SUPERADMIN_ASSIGNED',
    before: { systemRole: null },
    after: { systemRole: 'SUPERADMIN' },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot revoke your own SUPERADMIN role' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { systemRole: null },
  })
  await createAuditEntry({
    orgId: null,
    actorId: user.id,
    entityType: 'SUPERADMIN',
    entityId: userId,
    entityLabel: updated.email ?? userId,
    action: 'SUPERADMIN_REVOKED',
    before: { systemRole: 'SUPERADMIN' },
    after: { systemRole: null },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })
  return NextResponse.json({ ok: true })
}
