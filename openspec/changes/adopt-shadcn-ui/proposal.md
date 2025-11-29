# Change: Adopt shadcn/ui as primary design system

## Why
Current UI uses ad-hoc Tailwind styles with inconsistent primitives. Adopting shadcn/ui will standardize components, speed feature work, and improve visual consistency for the Jira Lite MVP.

## What Changes
- Introduce shadcn/ui component library and tokens as the default design system.
- Establish base theme (fonts, colors, radius) and global styles wired to shadcn primitives.
- Require new and refactored screens to use shadcn/ui primitives (Button, Input, Card, Dialog, Form, Badge, Alert, Sheet) instead of custom styles.
- Provide migration guidance for existing pages to replace bespoke elements with shadcn equivalents.

## Impact
- Affected specs: ui-foundation (new).
- Affected code: global styles, layout fonts, shared UI components, page-level forms/buttons/alerts, build tooling (shadcn config, tailwind tokens).
