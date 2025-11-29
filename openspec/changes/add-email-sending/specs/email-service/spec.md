## ADDED Requirements

### Requirement: Email Service Module
The system SHALL provide a centralized email service module (`lib/mailer.ts`) using Nodemailer to connect to Mailpit (localhost:1025) for local email testing and delivery.

#### Scenario: Send email via Mailpit
- **WHEN** `sendPasswordResetEmail()` or `sendTeamInviteEmail()` is called
- **THEN** the email is sent via Mailpit SMTP (localhost:1025)
- **AND** the email is logged to stderr on success
- **AND** errors are logged but do not block the caller (fire-and-forget)

#### Scenario: Mailpit connection
- **WHEN** the service initializes
- **THEN** it reads `SMTP_HOST` and `SMTP_PORT` from environment (defaults: localhost:1025)
- **AND** Nodemailer is configured with these SMTP credentials

#### Scenario: Email send failure handling
- **WHEN** email sending fails
- **THEN** error is logged to stderr/console
- **AND** the error is not thrown to the caller (async fire-and-forget model)
- **AND** a warning is logged for debugging

#### Scenario: HTML email support
- **WHEN** sending an email
- **THEN** HTML content is supported via `html` property
- **AND** plain-text fallback can be included via `text` property

---

### Requirement: Email Template System
The system SHALL provide pre-built, reusable email templates for common workflows (password reset, team invite).

#### Scenario: Password reset email template
- **WHEN** a password reset email is composed
- **THEN** it includes a reset link with token (valid for 1 hour per FR-003)
- **AND** includes user name and clear instructions
- **AND** is available in both HTML and plain-text format

#### Scenario: Team invite email template
- **WHEN** a team invite email is composed
- **THEN** it includes the team name, inviter name, and join/accept link
- **AND** is available in both HTML and plain-text format
- **AND** includes expiration note (7 days per FR-013)

---

### Requirement: Mailpit Integration in Docker Compose
The system SHALL replace MailHog with Mailpit for local email testing.

#### Scenario: Mailpit service runs in Docker Compose
- **WHEN** docker-compose is started
- **THEN** Mailpit service runs on SMTP port 1025 and web UI port 8025
- **AND** Mailpit is restarted automatically on failure
- **AND** email traffic can be inspected via the web UI at http://localhost:8025
