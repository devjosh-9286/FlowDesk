import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ 'org-slug': string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const entityType = searchParams.get('entityType') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const actor = searchParams.get('actor') ?? undefined
  const days = Number(searchParams.get('days') ?? 7)
  const page = Number(searchParams.get('page') ?? 1)
  const limit = 50
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const where = {
    orgId: membership.orgId,
    createdAt: { gte: since },
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(actor
      ? { actor: { OR: [{ name: { contains: actor, mode: 'insensitive' as const } }, { email: { contains: actor, mode: 'insensitive' as const } }] } }
      : {}),
  }

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        org: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, limit })
}
