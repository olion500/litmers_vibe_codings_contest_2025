# Change: Ship AI-powered Jira Lite MVP

## Why
The PRD defines a lightweight, AI-augmented issue tracker that must be designed, built, and deployed end-to-end; we need a scoped plan that turns the FR list into implementable specs and tasks.

## What Changes
- Stand up auth (email/password, password reset, Google OAuth) and profile management.
- Add team lifecycle (create/update/delete, invites, roles, activity log) and per-team access control.
- Provide project lifecycle, favorites, archive/restore, and soft-delete semantics.
- Deliver issue management (CRUD, status, assignment, labels, search/filter, subtasks, history) with kanban board and drag/drop ordering.
- Implement AI helpers (summary, suggestion, auto-label, duplicate detection, comment summary) with rate limiting and caching rules.
- Add dashboards, notifications, and data limits matching the PRD.
- Enforce security constraints (membership verification, soft delete) and deployment-ready configuration.

## Impact
- Affected specs: auth, team-management, project-management, issue-management, ai-features, kanban, comments, dashboards, notifications, security.
- Affected code: backend auth/session APIs, team/project/issue domain models, AI service client, email + Google OAuth integration, frontend pages (auth, teams, projects, issues, dashboards, notifications), deployment config.
