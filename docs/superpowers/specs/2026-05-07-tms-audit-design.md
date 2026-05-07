# FlowDesk — Tenant Management System & Audit Dashboard: Design Spec

**Date:** 2026-05-07  
**Status:** Approved for implementation planning  
**Builds on:** `2026-04-20-project-task-manager-design.md`

---

## 1. Overview

Two features added to FlowDesk:

1. **Tenant Management System (TMS)** — Two-tier admin layer. A platform-level Master TMS (`/master/*`) lets SUPERADMINs configure all client tenants (plan, seats, feature flags, SSO, branding). A per-org Client TMS (`/[org-slug]/tms/*`) gives org ADMINs a dedicated IT control panel for user provisioning, role management, and org-scoped settings — separate from day-to-day project work.

2. **Audit Dashboard** — Field-level, before/after change log across all auditable entities. Visible to org ADMINs within their own scope. SUPERADMINs see a cross-tenant view. 90-day retention with daily purge job.

---

## 2. Data Model Changes

### 2.1 `User` table — new column

```
systemRole: "SUPERADMIN" | null   (default: null)
```

Not org-scoped. A user with `systemRole = SUPERADMIN` has platform-wide access via `/master/*` routes, independent of any org membership.

### 2.2 `TenantConfig` table — new, one row per org

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `orgId` | int UNIQUE FK | One config per org |
| `plan` | enum `free\|pro\|enterprise` | Default: `free` |
| `seatLimit` | int | Default: 5 |
| `featureFlags` | JSONB | See shape below |
| `ssoConfig` | JSONB | See shape below |
| `branding` | JSONB | See shape below |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

`featureFlags` shape:
```json
{
  "flowBuilder": true,
  "approvals": true,
  "analytics": false,
  "customBranding": false
}
```

`ssoConfig` shape:
```json
{
  "provider": "saml" | "oauth" | null,
  "entityId": "https://sso.acme.com/saml",
  "ssoUrl": "https://sso.acme.com/login",
  "certificate": "<x509>",
  "clientId": null,
  "clientSecret": null
}
```

`branding` shape:
```json
{
  "logoUrl": "https://cdn.example.com/logo.png",
  "primaryColor": "#1a73e8",
  "companyName": "Acme Corp"
}
```

### 2.3 `AuditLog` table — new

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `orgId` | int FK nullable | `null` = platform-level action with no org target (SUPERADMIN_ASSIGNED, SUPERADMIN_REVOKED). All org-scoped actions — including SUPERADMIN edits to TenantConfig — carry the target org's ID. |
| `actorId` | int FK | User who performed the action |
| `entityType` | varchar | See entity types below |
| `entityId` | varchar | ID of the changed record |
| `entityLabel` | varchar | Human-readable name at time of event (e.g. "Alpha Launch") |
| `action` | varchar | See action types below |
| `before` | JSONB nullable | State before change. Null for CREATE. |
| `after` | JSONB nullable | State after change. Null for DELETE. |
| `ipAddress` | varchar nullable | Request IP |
| `createdAt` | timestamp | Indexed for range queries and TTL purge |

**Entity types:**
`PROJECT | TASK | TEMPLATE | USER | ORG_MEMBERSHIP | DEPARTMENT | TENANT_CONFIG | APPROVAL | SUPERADMIN`

**Action types:**
`CREATE | UPDATE | DELETE | ROLE_CHANGED | STAGE_ADVANCED | APPROVAL_GRANTED | APPROVAL_REJECTED | PLAN_CHANGED | FEATURE_FLAG_CHANGED | SSO_CONFIG_CHANGED | BRANDING_CHANGED | SUPERADMIN_ASSIGNED | SUPERADMIN_REVOKED`

**Index:** `CREATE INDEX ON "AuditLog" ("orgId", "createdAt" DESC)` — covers scoped queries and TTL purge.

---

## 3. Middleware

### 3.1 Master TMS middleware (`/master/*`)

New `masterMiddleware` runs before any `/master` route:
- Reads session user
- Checks `user.systemRole === 'SUPERADMIN'`
- On fail: 403, redirect to `/`
- Never checks `orgId` — master routes are not org-scoped

### 3.2 Client TMS middleware (`/[org-slug]/tms/*`)

Reuses existing org middleware, adds ADMIN role check:
- Validates org membership exists for current user in `[org-slug]`
- Checks `membership.role === 'ADMIN'`
- On fail: 403

---

## 4. Master TMS — Routes & UI

All routes under `/master/*`. Own layout (`MasterShell`) with sidebar separate from the org shell.

### Routes

| Route | Description |
|---|---|
| `/master` | Platform dashboard: tenant count, total users, pro/enterprise counts, seat warnings |
| `/master/tenants` | All orgs table: name, plan, seats used/limit, status, created date |
| `/master/tenants/[org-slug]` | Org detail with tab nav (Config / Users / Audit) |
| `/master/tenants/[org-slug]/config` | Edit plan, seatLimit, featureFlags, ssoConfig, branding |
| `/master/tenants/[org-slug]/users` | All org members: name, role, dept, last active |
| `/master/tenants/[org-slug]/audit` | AuditLog scoped to this org |
| `/master/admins` | List users with `systemRole = SUPERADMIN`. Assign / revoke. |
| `/master/audit` | Cross-tenant AuditLog — no orgId filter by default |

### Tenant config screen (`/master/tenants/[orgId]/config`)

Four sections:
1. **Plan & Limits** — plan dropdown, seatLimit integer field
2. **Feature Flags** — toggle per flag (flowBuilder, approvals, analytics, customBranding)
3. **SSO Configuration** — provider select, entityId, ssoUrl, certificate fields
4. **Save / Discard** action bar

Changes to plan, featureFlags, ssoConfig each write a separate AuditLog entry with `before`/`after` JSONB.

### Navigation entry point

SUPERADMIN users see a **"Platform"** link in the global nav (outside any org shell) that routes to `/master`.

---

## 5. Client TMS — Routes & UI

Dedicated admin portal within the org, at `/[org-slug]/tms/*`. Separate from the existing `/[org-slug]/admin/*` routes (which remain for flow templates and people management).

### Routes

| Route | Description |
|---|---|
| `/[org-slug]/tms` | Org dashboard: seat usage bar, active project count, dept count |
| `/[org-slug]/tms/users` | User table with Invite / Edit / Remove. Role and dept shown. |
| `/[org-slug]/tms/roles` | Role assignment per dept. Bulk role change. |
| `/[org-slug]/tms/sso` | Read-only view of SSO config (set by SUPERADMIN only) |
| `/[org-slug]/tms/branding` | Edit logo, primaryColor, companyName (if `customBranding` feature flag enabled) |
| `/[org-slug]/tms/audit` | AuditLog scoped to this org |
| `/[org-slug]/tms/billing` | Read-only: current plan, seat count, renewal date. CTA: "Contact support to change plan." |

### Seat usage warning

When `seatsUsed / seatLimit >= 0.9`, seat bar turns amber and a warning banner renders: "You are near your seat limit. Contact support to increase."

### Navigation entry point

Org ADMINs see an **"Admin Portal"** link in the org sidebar that routes to `/[org-slug]/tms`.

---

## 6. Audit Dashboard

### 6.1 SUPERADMIN view (`/master/audit`)

Full cross-tenant log. No default orgId filter.

**Filters:**
- Tenant (select, all orgs)
- Entity type (Project / Task / User / TenantConfig / Approval / etc.)
- Action (Create / Update / Delete / Role Changed / Stage Advanced / etc.)
- Actor (free-text search on name or email)
- Date range (Last 7d / 30d / 90d)
- Export CSV button

**Table columns:** Timestamp · Tenant · Actor · Entity (chip + name) · Action (chip) · Details button

### 6.2 Org Admin view (`/[org-slug]/tms/audit`)

Same component, `orgId` prop pre-filled. Tenant column hidden. Tenant filter hidden.

### 6.3 Details modal

Clicking **"Details ↗"** on any row opens a modal:

- **Header:** entity name, timestamp, tenant, actor name, IP address
- **Body:** one section per changed field
  - Field name (monospace label)
  - Before box (red background, monospace) — absent for CREATE
  - After box (green background, monospace) — absent for DELETE
  - Unchanged fields shown greyed for context
- **Footer:** event UUID · "Copy JSON" button (copies raw `{ before, after }` to clipboard)

Modal is dismissible via ✕ button or clicking overlay.

### 6.4 What gets audited

Every mutating API route handler calls `createAuditEntry()` after a successful DB write.

| Entity | Audited actions |
|---|---|
| Project | CREATE, UPDATE (any field), DELETE |
| Task | CREATE, UPDATE (status, assignee, dueDate, title), DELETE |
| FlowTemplate | CREATE, UPDATE, DELETE, published, assigned to dept |
| OrgMembership | CREATE (user invited), DELETE (user removed), ROLE_CHANGED |
| Department | CREATE, UPDATE, DELETE |
| ApprovalRecord | APPROVAL_GRANTED, APPROVAL_REJECTED |
| Project stage | STAGE_ADVANCED (entityType = PROJECT, action = STAGE_ADVANCED) |
| TenantConfig | PLAN_CHANGED, FEATURE_FLAG_CHANGED, SSO_CONFIG_CHANGED, BRANDING_CHANGED |
| User.systemRole | SUPERADMIN_ASSIGNED, SUPERADMIN_REVOKED |

---

## 7. Audit Writer Implementation

### Helper: `createAuditEntry()`

```ts
// src/lib/audit.ts
export async function createAuditEntry(params: {
  orgId: number | null
  actorId: number
  entityType: string
  entityId: string
  entityLabel: string
  action: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string
}) {
  try {
    await db.auditLog.create({ data: params })
  } catch {
    // Fire-and-forget — audit failure never breaks the main operation
  }
}
```

- `before`/`after` are full entity snapshots, not diffs. The modal diffs them client-side.
- Called **after** the main DB write succeeds, never before.
- Errors are swallowed — audit failure must never fail the user's action.
- **Sensitive field masking:** Before writing `before`/`after` for `TenantConfig`, strip `ssoConfig.clientSecret` and replace with `"[REDACTED]"`. No secrets in the audit log.

### Retention purge job

Daily cron (Next.js route handler on a cron trigger, or Vercel Cron):

```ts
// src/app/api/cron/audit-purge/route.ts
await db.auditLog.deleteMany({
  where: { createdAt: { lt: subDays(new Date(), 90) } }
})
```

Runs at 03:00 UTC. Protected by a `CRON_SECRET` header check.

---

## 8. Feature Flag Enforcement

Every feature-gated route and UI element checks `TenantConfig.featureFlags` for the org:

```ts
const config = await getTenantConfig(orgId)
if (!config.featureFlags.flowBuilder) return notFound()
```

Helper `getTenantConfig(orgId)` — fetches and caches TenantConfig per request via Next.js `cache()`. Falls back to all-false flags if no TenantConfig row exists (shouldn't happen after org creation, but safe default).

---

## 9. Route Structure Summary

```
/master/                          → Platform dashboard (SUPERADMIN)
/master/tenants                   → All orgs
/master/tenants/[org-slug]           → Org detail (tab: Config / Users / Audit)
/master/tenants/[org-slug]/config    → Edit plan, flags, SSO, branding
/master/tenants/[org-slug]/users     → Org member list
/master/tenants/[org-slug]/audit     → Org-scoped audit
/master/admins                    → SUPERADMIN management
/master/audit                     → Cross-tenant audit

/[org-slug]/tms                   → Org admin dashboard
/[org-slug]/tms/users             → User provisioning
/[org-slug]/tms/roles             → Role assignment
/[org-slug]/tms/sso               → SSO config (read-only)
/[org-slug]/tms/branding          → Branding (if flag enabled)
/[org-slug]/tms/audit             → Org-scoped audit
/[org-slug]/tms/billing           → Plan / seat info (read-only)
```

Existing routes unchanged:
```
/[org-slug]/admin/templates/*     → Flow builder (unchanged)
/[org-slug]/admin/people          → People & roles (unchanged)
/[org-slug]/admin/settings        → Org settings (unchanged)
```

---

## 10. Out of Scope

- Real-time audit stream / webhooks (Phase 3)
- Audit log export beyond CSV (Phase 3)
- Custom audit retention periods per tenant (Phase 3)
- SSO enforcement (blocking non-SSO login when SSO configured) — stored in Phase 2, enforced in Phase 3
- Self-serve plan upgrades via Stripe (Phase 2 — billing page is read-only at MVP)
- Custom named approver groups (already deferred in original spec, Phase 2)
