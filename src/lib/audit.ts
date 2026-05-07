import { db } from '@/lib/db'

export type AuditParams = {
  orgId: string | null
  actorId: string
  entityType: string
  entityId: string
  entityLabel: string
  action: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string
}

/**
 * Strip secrets before writing to audit log.
 * Currently masks ssoConfig.clientSecret for TENANT_CONFIG entities.
 */
export function maskSensitiveFields(
  entityType: string,
  snapshot: Record<string, unknown>
): Record<string, unknown> {
  if (entityType !== 'TENANT_CONFIG') return snapshot
  const copy = structuredClone(snapshot)
  if (copy.ssoConfig && typeof copy.ssoConfig === 'object') {
    const sso = copy.ssoConfig as Record<string, unknown>
    if ('clientSecret' in sso) sso.clientSecret = '[REDACTED]'
  }
  return copy
}

export function buildAuditParams(params: AuditParams): AuditParams {
  const { entityType, before, after } = params
  return {
    ...params,
    before: before ? maskSensitiveFields(entityType, before) : null,
    after: after ? maskSensitiveFields(entityType, after) : null,
  }
}

/**
 * Write one audit log entry. Fire-and-forget — never throws.
 * Call AFTER the main DB write succeeds.
 */
export async function createAuditEntry(params: AuditParams): Promise<void> {
  try {
    const safe = buildAuditParams(params)
    await db.auditLog.create({ data: safe })
  } catch {
    // Intentional: audit failure must never break the caller's operation.
  }
}
