# Change: Add sidebar navigation

## Why
Users need a consistent way to move between core areas (Projects, Teams, Issues, Profile, Logout) without relying on ad-hoc links on each page. A fixed sidebar improves discoverability and reduces navigation friction.

## What Changes
- Add a left sidebar navigation shell present on authenticated pages.
- Include links for Projects, Teams, Profile, and Sign out; highlight the active route.
- Ensure responsive behavior (collapsible on small screens) with shadcn/ui primitives.

## Impact
- Affected specs: navigation (new capability).
- Affected code: global layout (`app/layout.tsx` or a new app shell), shared nav components, auth-aware links and sign-out action.
