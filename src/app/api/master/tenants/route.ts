import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'

export async function GET(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tenantConfig: true,
      _count: { select: { memberships: true } },
    },
  })
  return NextResponse.json({ orgs })
}
