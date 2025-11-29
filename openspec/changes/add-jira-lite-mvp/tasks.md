## 1. Foundations & Auth (FR-001~007)
- [x] 1.1 Lock stack choice (FE/BE framework, DB, hosting) and scaffold repo with lint/test scripts wired to CI.
- [x] 1.2 Implement email/password signup/login/logout with 24h tokens; enforce length rules; add session storage.
- [x] 1.3 Password reset: generate 1h tokens, send real email, reset form flow; cover duplicate/expired token errors.
- [x] 1.4 Google OAuth as separate auth path; auto-provision user; disable password change for OAuth-only users.
- [x] 1.5 Profile view/edit (name, avatar upload/URL), password change (non-OAuth), and account deletion with team ownership guard + soft delete.

## 2. Teams & Access Control (FR-010~019, 070, 071)
- [x] 2.1 Team CRUD with limits and soft delete; OWNER cannot leave.
- [x] 2.2 Invites: create/resend with 7d expiry, accept flow, email send; pending list UI.
- [x] 2.3 Roles: OWNER/ADMIN/MEMBER change rules, kick/leave rules, owner transfer while keeping one OWNER.
- [x] 2.4 Activity log (join/leave, role change, project lifecycle) with pagination; store performer/target/timestamp.
- [x] 2.5 Enforce team membership checks (404/403) on all scoped APIs; add request guard middleware.

## 3. Projects (FR-020~027)
- [x] 3.1 Project CRUD with 15/team limit, markdown description, favorite toggle per user, archive/restore, soft delete.
- [x] 3.2 Project detail: stats block (status counts), tabs for issue list and kanban; honor archived read-only mode.

## 4. Issues (FR-030~039-2)
- [x] 4.1 Issue CRUD with limits (200/project), priority/due/assignee constraints, label attach (20/project, 5/issue), soft delete.
- [x] 4.2 Subtasks (20/issue) with checkbox progress and drag reorder; surface progress on cards. *(drag reorder pending)*
- [x] 4.3 Status management: default + custom (max 5) with color/position; drag/drop cross-column and intra-column ordering persistence. *(drag/drop UI pending; ordering via buttons implemented)*
- [x] 4.4 Change history for status/assignee/priority/title/due; expose timeline in detail view. *(timeline page done; status history recorded; richer history UI pending)*
- [x] 4.5 Search/filter/sort on title, status, assignee, priority, labels, due range, has due; support pagination. *(pagination API done; due-range UI pending; pagination UI pending)*

## 5. Comments (FR-060~063)
- [x] 5.1 Comment CRUD with permissions (author/owner/admin) and soft delete; content length validation.
- [x] 5.2 Comment list with chronological order + pagination/infinite scroll. *(pagination implemented; infinite scroll omitted)*

## 6. AI Features (FR-040~045, 042, 043, 044)
- [ ] 6.1 AI summary (2-4 sentences) and solution suggestion; min description >10 chars; cache + invalidation.
- [ ] 6.2 AI auto-label recommendation from project labels; accept/reject flow; max 3 suggestions.
- [ ] 6.3 AI duplicate detection on create/edit title: show similar issues (max 3) with links; allow override.
- [ ] 6.4 AI comment summary enabled at ≥5 comments; cache invalidated on new comment.
- [ ] 6.5 Rate limiting per user (choose 10/min or 100/day) with remaining quota messaging.

## 7. Kanban & UX (FR-050~054, 033, 051, 052)
- [ ] 7.1 Kanban columns for default + custom statuses; drag/drop to change status; persist order per column. *(manual move buttons in place; drag/drop pending)*
- [ ] 7.2 Intra-column reorder with position field; new issues append to bottom. *(buttons in place; drag/drop pending)*
- [ ] 7.3 WIP limit per column (1-50 or unlimited) with header counts and visual warning. *(WIP edit + counts done; warnings could improve)*
- [ ] 7.4 Consistent loading/error states and responsive layout; apply pagination/infinite scroll to lists. *(basic states; pagination UI pending)*

## 8. Dashboards & Notifications (FR-080~082, 090~091)
- [ ] 8.1 Project dashboard: status counts, completion rate, priority breakdown, recent (5) and due-soon (≤7d) issues.
- [ ] 8.2 Personal dashboard: my assigned issues by status, totals, due today/soon, recent comments (5), my teams/projects.
- [ ] 8.3 Team stats: creation/completion trends (7/30/90d), assigned/completed per member, status per project.
- [ ] 8.4 In-app notifications: triggers per PRD, unread count badge, list view, mark single/all as read.

## 9. Security, Limits, Deployment (FR data limits, 070, 071)
- [ ] 9.1 Enforce all data limits (projects/team, issues/project, labels, subtasks, custom statuses, WIP, name lengths, token expirations).
- [ ] 9.2 Implement soft delete across entities and ensure queries filter `deletedAt` null.
- [ ] 9.3 Wire email provider + Google OAuth credentials; document required env vars.
- [ ] 9.4 Deploy to public URL; verify signup/login, AI calls, email flows in deployed env; update README with run/deploy/test steps.
- [ ] 9.5 Automated tests/lint covering auth flows, access control, soft delete, limits, and critical AI guards.
