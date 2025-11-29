## Context
Building a full-stack, AI-augmented issue tracker with authentication, team/project/issue lifecycle, dashboards, notifications, and deployment within short time. Need pragmatic architecture that can be shipped quickly and supports soft-delete and membership scoping.

## Goals / Non-Goals
- Goals: ship MVP that matches PRD limits; prioritize correctness of workflows and AI helpers; keep stack simple to host (e.g., Next.js/React + API routes + Postgres/Prisma or Supabase). Implement real email + Google OAuth.
- Non-Goals: enterprise-grade RBAC beyond OWNER/ADMIN/MEMBER; real-time websockets (bonus only); SSO providers beyond Google.

## Decisions
- Monorepo with single web app (Next.js suggested) using server actions/API routes for backend; Prisma ORM to speed CRUD and soft-delete filters.
- JWT/session via NextAuth or custom, with token TTL 24h; include per-team access middleware returning 404/403 per PRD.
- Email: use provider SDK (e.g., Resend/SendGrid) with templated emails for invites/password reset.
- AI: wrap provider (OpenAI/Claude) behind service module enforcing min-length guard, caching result per issue, and rate-limit middleware (Redis or in-DB counters, choose one policy 10/min preferred for simplicity).
- Soft delete via `deletedAt` on key tables; default scopes exclude deleted rows.
- Audit/activity logs and change history stored as append-only tables; surfaced via paginated endpoints.

## Risks / Trade-offs
- Time risk due to breadth: mitigate by staging delivery (auth/teams → projects/issues → AI → dashboards/notifications).
- AI cost/rate limits: cache and guard by length; add feature flag to disable AI in dev.
- Email deliverability: use tested provider with sandbox/testing mode for local.

## Migration Plan
- Start with schema migration for auth/team/project/issue/comment/status/notification tables; add indices for filters.
- Incrementally add AI-related columns (summary cache, suggestion cache) and status ordering fields.

## Open Questions
- Preferred AI provider and key availability?
- Deployment target (Vercel/Render) and database choice (Supabase/Neon/PlanetScale)?
