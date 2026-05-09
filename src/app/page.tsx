import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Root() {
  const session = await auth()
  if (session?.user?.id) redirect('/orgs')
  else redirect('/login')
}
