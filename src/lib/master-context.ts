import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export type SuperadminUser = {
  id: string
  name: string | null
  email: string
  systemRole: string | null
}

export async function getSuperadminSession(): Promise<SuperadminUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, systemRole: true },
  })
  if (!user || user.systemRole !== 'SUPERADMIN') return null
  return user
}
