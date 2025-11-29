## ADDED Requirements
### Requirement: Standardized UI Primitives
The system SHALL provide a shared set of shadcn/ui primitives (at minimum: button, input, textarea, select, label, card, badge, alert, dialog, sheet, form controls, checkbox, radio, switch, skeleton) under `components/ui/` for reuse across app routes.

#### Scenario: Primitives available to pages
- **WHEN** a page imports UI elements for forms or actions
- **THEN** the components are imported from `@/components/ui/*` and match the generated shadcn primitives without page-specific copies.

### Requirement: Theme Tokens and Globals
The system SHALL define shadcn-compatible theme tokens (background, foreground, muted, accent, border, ring, radius, primary) via CSS variables and ensure global styles map font-sans to Geist.

#### Scenario: Global theme applied
- **WHEN** the app renders any page
- **THEN** the `:root` defines the theme CSS variables and the body uses the Geist font variables so shadcn components render with consistent colors and typography.

### Requirement: Migration Coverage for Core Flows
The system SHALL migrate existing auth, team, project, and issue UI to use shadcn primitives for buttons, form fields, cards, and status/label badges.

#### Scenario: Auth screens use shadcn
- **WHEN** a user visits login, register, or reset-password pages
- **THEN** form fields, primary actions, and validation/error messages use shadcn/ui components instead of raw HTML inputs/buttons.

#### Scenario: Core entities use shadcn
- **WHEN** users interact with team/project/issue list or detail pages
- **THEN** primary actions, form inputs, and badges leverage shadcn primitives, removing bespoke styling for these flows.

### Requirement: Guardrails Against Raw Elements
The system SHALL include a lightweight check (lint rule or CI script) that flags new raw `<button>`/`<input>` usage in app routes unless deliberately exempted.

#### Scenario: CI flags raw elements
- **WHEN** lint or CI runs on the codebase
- **THEN** it fails or warns if new raw form controls are added outside approved shadcn wrappers, guiding developers to use the design system.
