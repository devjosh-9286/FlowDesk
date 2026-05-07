import { cache } from 'react'
import { db } from '@/lib/db'

export type FeatureFlags = {
  flowBuilder: boolean
  approvals: boolean
  analytics: boolean
  customBranding: boolean
}

const FLAG_DEFAULTS: FeatureFlags = {
  flowBuilder: true,
  approvals: true,
  analytics: false,
  customBranding: false,
}

export function mergeWithDefaults(partial: Partial<FeatureFlags>): FeatureFlags {
  return { ...FLAG_DEFAULTS, ...partial }
}

export type TenantConfigRow = {
  id: string
  orgId: string
  plan: string
  seatLimit: number
  featureFlags: FeatureFlags
  ssoConfig: Record<string, unknown>
  branding: Record<string, unknown>
}

/** Cached per-request fetch of TenantConfig. Falls back to safe defaults if no row exists. */
export const getTenantConfig = cache(async (orgId: string): Promise<TenantConfigRow> => {
  const row = await db.tenantConfig.findUnique({ where: { orgId } })
  if (!row) {
    return {
      id: '',
      orgId,
      plan: 'free',
      seatLimit: 5,
      featureFlags: FLAG_DEFAULTS,
      ssoConfig: {},
      branding: {},
    }
  }
  return {
    ...row,
    featureFlags: mergeWithDefaults(row.featureFlags as Partial<FeatureFlags>),
    ssoConfig: row.ssoConfig as Record<string, unknown>,
    branding: row.branding as Record<string, unknown>,
  }
})

export function isFeatureEnabled(
  config: TenantConfigRow | null,
  flag: keyof FeatureFlags
): boolean {
  if (!config) return false
  return config.featureFlags[flag] === true
}
