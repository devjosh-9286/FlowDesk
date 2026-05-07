import { redirect } from 'next/navigation'

export default async function TenantRoot({
  params,
}: {
  params: Promise<{ 'org-slug': string }>
}) {
  const { 'org-slug': slug } = await params
  redirect(`/master/tenants/${slug}/config`)
}
