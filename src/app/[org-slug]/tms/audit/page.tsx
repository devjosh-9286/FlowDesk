'use client'
import { useParams } from 'next/navigation'
import { AuditTable } from '@/components/audit/AuditTable'

export default function TmsAuditPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Audit Log</h1>
      <p className="text-slate-500 text-sm mb-6">Your org only · 90-day retention</p>
      <AuditTable apiUrl={`/api/tms/${slug}/audit`} showTenantFilter={false} />
    </div>
  )
}
