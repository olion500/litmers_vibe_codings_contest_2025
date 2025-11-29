## Context
The MVP requires sending real emails for critical workflows (password reset, team invitations). Local development must work out-of-the-box; production must support common email providers. Nodemailer is already a dependency, providing flexibility to switch providers via .env configuration.

## Goals / Non-Goals
- Goals: Provide simple, tested email service; support Mailpit in dev and SMTP/SendGrid/AWS SES in production; include HTML + plaintext templates; enforce rate limiting on password reset and invites.
- Non-Goals: Complex email queueing or retry logic (Nodemailer handles basic retry); batch email sending; email unsubscribe management.

## Decisions
- **Email Service Module**: Single `lib/email/` module (or extend existing `lib/mailer.ts`) with Nodemailer connecting to Mailpit (localhost:1025) only.
- **Local-Only Approach**: No third-party email providers (SendGrid, AWS SES) supported; Mailpit is the single implementation for local development/testing.
- **Templates**: Simple HTML email templates for password reset and team invite; render with basic string interpolation.
- **Rate Limiting**: Enforce via database counters on `PasswordResetToken` (FR-003) and `TeamInvite` (FR-013) tables; check before creating/resending.
- **Error Handling**: Log email send errors to stderr; do not block UI (async, fire-and-forget model); show user a "check your email" message even if send fails.
- **Mailpit**: Drop-in replacement for MailHog; lighter, Docker-native, same port 1025 for SMTP and 8025 for web UI.

## Risks / Trade-offs
- Email delivery risk in production: mitigate by testing with SendGrid sandbox or AWS SES sandbox before going live.
- Failed sends in dev must not block signup/reset flow; we show "check your email" message and allow retry in real env.
- Rate limiting on resets and invites is per-user, not global; acceptable for MVP.

## Migration Plan
1. Update `docker-compose.yml` to use Mailpit instead of MailHog.
2. Add `lib/email/` module with Nodemailer init and send logic.
3. Add email templates (password reset, team invite).
4. Extend Prisma schema: add `PasswordResetToken` table and `TeamInvite` table.
5. Implement password reset email endpoint (FR-003).
6. Implement team invite email endpoint (FR-013).
7. Add .env.example with email provider options.
8. Test locally with Mailpit and optionally with SendGrid sandbox.

## Open Questions
- Which email provider for production: SendGrid, AWS SES, or custom SMTP?
- Should we implement email queue/retry for failed sends, or keep fire-and-forget?
- Should rate limiting be enforced at endpoint level or service level?
