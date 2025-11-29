## Context
The app currently relies on ad-hoc Tailwind v4 utility classes and minimal global CSS. The `shadcn` CLI is installed but no components or tokens are present. We need a consistent design system that works with Next.js 16 + Tailwind v4 and is easy to migrate onto existing screens.

## Goals / Non-Goals
- Goals: standardize primitives (buttons, forms, surfaces, overlays), centralize theme tokens, and reduce one-off styling. Keep visual scope minimal but consistent.
- Non-Goals: full visual redesign, custom theming system beyond shadcn defaults, or building a bespoke component library.

## Decisions
- Use shadcn/ui components generated into `components/ui/*` with tree-shaken, colocated styles; prefer composable primitives over page-specific bespoke styles.
- Keep Tailwind v4; if a component requires v3-only plugins, use CSS variables/local styles instead of downgrading Tailwind. Adjust generated classes to be v4-safe (e.g., replace `bg-background`/`text-foreground` vars, avoid `@apply` where not supported).
- Base theme: light-first palette with CSS variables `--background`, `--foreground`, `--muted`, `--accent`, `--border`, `--ring`, `--radius`. Add dark tokens for future toggle, even if UI toggle ships later.
- Fonts: continue Geist Sans/Mono as root fonts via `next/font`; map shadcn `font-sans` to Geist variable.

## Risks / Trade-offs
- Tailwind v4 compatibility: some generated components may rely on v3 directives; mitigation: audit and patch generated CSS to v4-friendly styles.
- Migration scope creep: replacing every element could be large; mitigation: prioritize auth + core CRUD flows, leave low-risk areas for follow-up tasks.
- Visual regressions: require manual QA passes on key flows.

## Migration Plan
1) Add shadcn config and generate primitives.
2) Replace auth forms and shared layouts.
3) Replace core project/team/issue actions and badges.
4) Add lightweight lint/grep to discourage raw elements.
5) QA desktop/mobile, fix regressions.

## Open Questions
- Should dark mode be enabled now or only keep tokens ready?
- Do we need specific brand colors beyond neutrals?
