# Change: Add Email Sending (Replace MailHog with Mailpit)

## Why
The PRD requires actual email sending for password reset (FR-003) and team invitations (FR-013). Currently, MailHog is configured for local SMTP testing but no production email sending mechanism exists. This change replaces MailHog with Mailpit (lighter, Docker-native) for local development and adds Nodemailer-based email sending with support for production email providers (SendGrid, AWS SES, or direct SMTP).

## What Changes
- Replace MailHog service in `docker-compose.yml` with Mailpit (lighter, more modern)
- Create email service module using Nodemailer with Mailpit for local development only
- Add password reset email endpoint (FR-003) with 1-hour token expiration
- Add team invite email endpoint (FR-013) with 7-day invite expiration
- Add .env configuration for SMTP (Mailpit default: localhost:1025)
- Create HTML and plain-text email templates for password reset and team invites
- Service executes locally only via Mailpit; no third-party email providers

## Impact
- Affected specs: email-service, auth, team-management
- Affected code: docker-compose.yml, .env.example, lib/email/ (new), app/api/auth/reset-password (new), app/api/teams/invite (new), Prisma schema (password reset token tracking)
- Breaking changes: None
- Dependencies: Nodemailer already in package.json; no new dependencies required
