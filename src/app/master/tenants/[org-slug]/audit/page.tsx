'use client'
import { useParams } from 'next/navigation'
import { AuditTable } from '@/components/audit/AuditTable'

export default function TenantAuditPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Audit Log — {slug}</h1>
      <p className="text-slate-500 text-sm mb-6">Scoped to this tenant</p>
      <AuditTable apiUrl={`/api/master/audit?orgSlug=${slug}`} showTenantFilter={false} />
    </div>
  )
}
