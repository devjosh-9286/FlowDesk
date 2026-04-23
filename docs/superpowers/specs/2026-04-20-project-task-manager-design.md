# FlowDesk — Project & Task Manager SaaS: Design Spec

**Date:** 2026-04-20  
**Status:** Approved for implementation planning

---

## 1. Product Overview

A general-purpose project management SaaS where organization admins define reusable workflow templates (flows), departments adopt those templates to spawn projects, and members execute work through a Kanban board. Core differentiator: admin-controlled, visually-built flows with mandatory/optional step enforcement, conditional branching, checklist gates, and approval requirements — bringing process uniformity across an org without rigidly locking everyone into identical tooling.

**Target domains:** Any (software teams, HR, marketing, operations, agencies, etc.)

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Full-stack, single repo, fast DX |
| Auth | NextAuth.js | Free, self-managed, supports multi-tenant sessions |
| ORM | Prisma | Type-safe DB access, great migration tooling |
| Database | Neon (serverless PostgreSQL) | Free tier sufficient for MVP, scales on demand |
| Flow builder | React Flow | Purpose-built node/edge editor, MIT licensed |
| Drag-and-drop | dnd-kit | Kanban card DnD, accessible, MIT licensed |
| UI | shadcn/ui + Tailwind CSS | Composable, unstyled-first, zero cost |
| Payments | Stripe | Revenue-proportional cost only, no monthly fee |

**Total infra cost at MVP:** ~$0/month (Neon free + Vercel hobby or Hetzner $4/mo VPS)

---

## 3. User Roles

Three-tier hierarchy, scoped per organization:

| Role | Capabilities |
|---|---|
| **Org Admin** | Create/edit/publish flow templates, manage departments, manage all members and roles, view org-wide analytics, billing |
| **Dept Manager** | Create projects from assigned templates, manage dept members, approve/reject approval gate requests, view dept analytics |
| **Member** | View and work on assigned projects, move tasks on Kanban, complete checklist items, request stage advancement |

All roles are scoped to a single org. A user can hold different roles across different orgs.

---

## 4. Multi-tenancy

- Every database row carries `orgId`
- API middleware validates `orgId` on every request against the authenticated session
- Org slugs form URL namespaces: `app.flowdesk.io/[org-slug]/...`
- No cross-org data is ever returned in any query

---

## 5. Data Model

### Core entities

**Organization** — `id, name, slug, plan(free|pro), createdAt`

**User** — `id, email, name, avatarUrl, createdAt`

**OrgMembership** — `orgId, userId, role(ADMIN|MANAGER|MEMBER), departmentId`  
Junction table linking users to orgs with their role and dept.

**Department** — `id, orgId, name, managerId`

**FlowTemplate** — `id, orgId, name, nodes(JSONB), edges(JSONB), assignedDeptIds(int[]), createdBy, publishedAt`  
Templates are blueprints. Nodes and edges stored as JSONB for flexibility. Departments can only spawn projects from templates explicitly assigned to them by an Org Admin — unassigned templates are not visible to dept members or managers.

**Project** — `id, orgId, deptId, flowTemplateId, name, status(active|done|archived), snapshotNodes(JSONB), currentNodeId, createdBy, createdAt`  
Projects snapshot the template's nodes at creation time — template edits don't affect running projects.

**Task** — `id, projectId, nodeId, title, assigneeId, dueDate, status(todo|in_progress|done), checklistItems(JSONB), createdAt`

**ApprovalRecord** — `id, projectId, nodeId, approverId, decision(approved|rejected), comment, decidedAt`

**Notification** — `id, userId, orgId, type, payload(JSONB), read(bool), createdAt`

### FlowNode shape (inside JSONB)

```json
{
  "id": "node_1",
  "type": "stage | approval | condition | end",
  "label": "Manager Sign-off",
  "isMandatory": true,
  "checklist": ["Review designs", "Check specs doc"],
  "approvers": { "userIds": [], "groupIds": ["dept-managers"] },
  "approvalMode": "any | all",
  "conditions": [
    { "field": "priority", "op": "eq", "value": "high", "goto": "node_3" },
    { "default": true, "goto": "node_4" }
  ]
}
```

---

## 6. Flow Builder (Admin)

Built with **React Flow**. Admins access via Org Admin → Flow Templates.

### Node types
- **Stage** — a phase of work. Has a label, optional checklist items, optional/mandatory flag.
- **Approval** — blocks progression until named approvers (users or groups) act. Always has mandatory flag configurable.
- **Condition** — diamond-shaped branch node. Admin defines rules (field + operator + value → goto nodeId). Default branch required.
- **End** — terminal node.

### Builder interactions
- Drag node types from left palette onto canvas
- Connect nodes by dragging edges between handles
- Click any node → right panel shows config: label, mandatory toggle, checklist editor, approver picker, condition rule editor
- Toolbar: Undo / Redo / Auto-layout / Zoom fit
- Save as draft or Publish
- Assign published template to one or more departments

### Enforcement model
- `isMandatory: true` — members cannot skip or bypass this node. UI blocks advancement until criteria met.
- `isMandatory: false` — node is suggested. Members can mark optional nodes as skipped with a reason.

---

## 7. Project Execution (Member Kanban)

When a dept member (or manager) creates a project, they pick from templates assigned to their dept. The template nodes are snapshotted into the project.

### Kanban columns (within current flow stage)
Fixed columns per stage: **To Do → In Progress → In Review → Done**

Tasks within the current stage are managed here. Members drag cards between columns via dnd-kit.

### Flow progress strip
Displayed above the Kanban board. Shows all flow stages in order: completed (green ✓), current (highlighted), future (dimmed), mandatory approval gates (red ★).

### Stage advancement
- Optional stages: member can mark complete at any time
- Mandatory stages: all tasks must reach Done before the "Advance" button unlocks
- Approval gates: member clicks "Request Approval" → notifies approvers → board locked until decision

### Task cards
Each card shows: title, assignee avatar, due date, labels, checklist progress bar (if checklist defined on the node).

---

## 8. Approval System

1. Member requests approval on a mandatory approval gate
2. System creates `ApprovalRecord` rows for each required approver and sends notifications
3. Approvers see inline Approve / Reject / View actions in notification panel
4. On approve: project advances to next node, members notified
5. On reject: project stays at gate, member notified with comment, can re-request after addressing feedback
6. Partial approvals (multiple approvers): configurable via `approvalMode` on the node — `any` (first approval advances) or `all` (every named approver must approve)

**Approver groups (MVP):** Only built-in group is `dept-managers` (all MANAGER-role members of the project's department). Custom named groups deferred to Phase 2.

---

## 9. Notifications (Phase 1)

**In-app only** at MVP. Email digest added in Phase 2.

Notification types:
- `approval_requested` — sent to approvers when a gate is triggered
- `approval_decided` — sent to project creator when approved/rejected
- `task_assigned` — sent to assignee when task assigned
- `stage_advanced` — sent to all project members when project moves to next stage
- `mention` — future phase

Implementation: DB polling via a server-side interval (every 60s) or Next.js route handler called client-side. WebSocket real-time deferred to Phase 2.

---

## 10. App Shell & Navigation

### Sidebar structure
- **Org switcher** (top) — multi-org support from day one
- **Workspace section** — Home, My Tasks, Projects, Notifications (with unread badge)
- **Departments section** — list of user's departments
- **Admin section** (Org Admin only) — Flow Templates, People & Roles, Org Settings

### Route structure
```
/[org-slug]/                        → Home dashboard
/[org-slug]/tasks                   → My Tasks
/[org-slug]/projects                → All accessible projects
/[org-slug]/projects/[id]           → Kanban board
/[org-slug]/notifications           → Notification center
/[org-slug]/admin/templates         → Flow template list
/[org-slug]/admin/templates/[id]    → Flow builder canvas
/[org-slug]/admin/people            → People & roles
/[org-slug]/admin/settings          → Org settings
```

---

## 11. Out of Scope (MVP)

- Real-time WebSocket updates (Phase 2)
- Email notifications (Phase 2)
- File attachments on tasks (Phase 2)
- Timeline / Gantt view (Phase 2)
- Public API / webhooks (Phase 3)
- White-label / reseller (Phase 3)
- Mobile app (Phase 3)

---

## 12. Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Flow nodes as JSONB | Yes | Avoids rigid node tables, flexible schema, Postgres JSONB is queryable |
| Project snapshots template | Yes | Template changes don't break running projects |
| NextAuth over Supabase Auth | Yes | Zero cost, no vendor lock-in |
| Kanban as primary view | Yes | Matches user mental model for task execution |
| Notifications via DB polling | Yes | Simple, zero infra, good enough for MVP scale |
| Stripe from day one | Yes | Revenue-proportional cost, no reason to defer |
