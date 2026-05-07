import { cache } from 'react'
import { db } from '@/lib/db'

export type OrgMembershipRow = {
  id: string
  orgId: string
  userId: string
  role: string
  departmentId: string | null
}

/**
 * Fetch the OrgMembership for a given user + org slug.
 * Returns null if the user is not a member or the org doesn't exist.
 * Cached per-request via React cache().
 */
export const getOrgMembership = cache(
  async (userId: string, orgSlug: string): Promise<OrgMembershipRow | null> => {
    const org = await db.organization.findUnique({ where: { slug: orgSlug } })
    if (!org) return null
    const membership = await db.orgMembership.findFirst({
      where: { orgId: org.id, userId },
    })
    if (!membership) return null
    return {
      id: membership.id,
      orgId: membership.orgId,
      userId: membership.userId,
      role: membership.role,
      departmentId: membership.departmentId ?? null,
    }
  }
)
