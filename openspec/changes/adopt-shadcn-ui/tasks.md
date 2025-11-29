## 1. Design System Setup
- [x] 1.1 Add shadcn/ui config (components.json) with project paths, Tailwind v4 bridge notes, and base theme tokens.
- [x] 1.2 Generate core primitives (button, input, textarea, select, label, card, badge, alert, dialog, sheet, form, checkbox, radio, switch, skeleton) under `components/ui/`.
- [x] 1.3 Wire global styles (fonts, background/foreground CSS vars) to shadcn tokens; ensure dark-mode tokens exist even if disabled by default.

## 2. Migration & Enforcement
- [x] 2.1 Replace existing auth forms (login, register, reset-password) to use shadcn form fields/buttons/alerts.
- [x] 2.2 Replace project/team/issue list & detail pages with shadcn primitives for buttons, cards, badges, inputs, selects.
- [x] 2.3 Add lint or CI check (lightweight) to flag usage of raw `<button>`/`<input>` in app routes unless wrapped by shadcn components.

## 3. Validation
- [x] 3.1 Run lint and vitest; fix snapshots/styles where needed.
- [ ] 3.2 Manual QA: smoke test auth, teams, projects, issues flows for visual regressions on desktop and mobile breakpoints.
