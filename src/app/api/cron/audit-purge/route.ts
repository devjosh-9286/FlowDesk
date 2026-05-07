import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = subDays(new Date(), 90)
  const { count } = await db.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  return NextResponse.json({ deleted: count, cutoff: cutoff.toISOString() })
}
