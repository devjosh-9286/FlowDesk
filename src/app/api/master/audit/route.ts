import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'

export async function GET(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orgSlug = searchParams.get('orgSlug') ?? undefined
  const entityType = searchParams.get('entityType') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const actor = searchParams.get('actor') ?? undefined
  const days = Number(searchParams.get('days') ?? 7)
  const page = Number(searchParams.get('page') ?? 1)
  const limit = 50

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  let orgId: string | undefined
  if (orgSlug) {
    const org = await db.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } })
    orgId = org?.id ?? undefined
  }

  const where = {
    createdAt: { gte: since },
    ...(orgId !== undefined ? { orgId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(actor
      ? {
          actor: {
            OR: [
              { name: { contains: actor, mode: 'insensitive' as const } },
              { email: { contains: actor, mode: 'insensitive' as const } },
            ],
          },
        }
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
