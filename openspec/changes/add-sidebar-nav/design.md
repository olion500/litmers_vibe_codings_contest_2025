## Context
Authenticated pages currently rely on per-page links; there is no shared navigation frame. We recently adopted shadcn/ui and have Button, Card, Sheet components available. Need a simple, responsive sidebar shell.

## Goals / Non-Goals
- Goals: add consistent navigation chrome with minimal intrusion; support mobile via toggle; use existing auth session and sign-out action.
- Non-Goals: full theming overhaul or breadcrumb system; no role-based menu logic beyond current access.

## Decisions
- Implement a `SidebarNav` component under `components/navigation.tsx` (or similar) using shadcn Button + Sheet for mobile.
- Mount sidebar in `app/layout.tsx` but exclude `(auth)` routes by using nested layout if needed (e.g., create `app/(app)/layout.tsx` and move pages under it) to avoid wrapping login/register.
- Active link detection via `usePathname()` on client component; use `Button` variants or `data-active` styles.

## Risks / Trade-offs
- Layout restructuring may require moving routes into a group to avoid wrapping auth pages; keep changes small.
- Need to ensure sign-out action still works with server actions and doesn't break caching.

## Migration Plan
1) Create shared sidebar component with desktop + mobile toggle.
2) Add new layout grouping for authenticated pages and wrap existing routes.
3) Verify links and sign-out action; run lint/tests; quick visual check.
