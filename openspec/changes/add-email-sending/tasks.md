## 1. Infrastructure Setup

- [ ] 1.1 Update `docker-compose.yml`: replace MailHog service with Mailpit image (axllent/mailpit:latest)
- [ ] 1.2 Add Mailpit environment variables to `.env.example` (EMAIL_PROVIDER=mailpit, SMTP_HOST, SMTP_PORT, etc.)
- [ ] 1.3 Verify docker-compose runs: `docker-compose up -d` and Mailpit web UI is accessible at http://localhost:8025

---

## 2. Email Service Module

- [ ] 2.1 Create `lib/email/index.ts` with Nodemailer init function supporting multiple providers (mailpit, sendgrid, aws-ses, smtp)
- [ ] 2.2 Create `lib/email/templates.ts` with email template functions for password reset and team invite
- [ ] 2.3 Add `sendEmail()` function to email service that wraps Nodemailer and handles errors (fire-and-forget, log errors)
- [ ] 2.4 Add unit tests for email service (mock Nodemailer, test template rendering, test error handling)

---

## 3. Database Schema Updates

- [ ] 3.1 Create Prisma migration: add `PasswordResetToken` table (id, userId, token, expiresAt, createdAt, consumedAt)
- [ ] 3.2 Create Prisma migration: add `TeamInvite` table (id, teamId, email, token, expiresAt, createdAt, acceptedAt)
- [ ] 3.3 Run migrations locally and test schema
- [ ] 3.4 Add indexes on `PasswordResetToken.token` and `TeamInvite.token` for fast lookups

---

## 4. Password Reset Email Implementation

- [ ] 4.1 Create API endpoint `POST /api/auth/forgot-password` that:
  - Accepts email
  - Checks user exists
  - Generates reset token (secure random, 1-hour expiration)
  - Saves token to `PasswordResetToken` table
  - Sends password reset email
  - Returns success message ("Check your email")
- [ ] 4.2 Create API endpoint `GET /api/auth/reset-password?token=<token>` that validates token and returns UI (or redirects to frontend form)
- [ ] 4.3 Create API endpoint `POST /api/auth/reset-password` that:
  - Validates token (exists, not expired, not consumed)
  - Validates new password (min 6 chars per FR-006)
  - Updates user password
  - Marks token as consumed
  - Logs user in or returns success message
- [ ] 4.4 Add rate limiting: reject reset requests if user requested one in last 15 minutes
- [ ] 4.5 Add integration tests for password reset flow (happy path, expired token, invalid token)

---

## 5. Team Invite Email Implementation

- [ ] 5.1 Create API endpoint `POST /api/teams/{teamId}/invites` that:
  - Validates user is OWNER or ADMIN
  - Accepts invitee email
  - Checks if invite already exists for that email
  - Creates `TeamInvite` record with 7-day expiration
  - Sends invite email
  - Returns success message
- [ ] 5.2 Create API endpoint `GET /api/teams/{teamId}/invites/{token}` that:
  - Validates invite token (exists, not expired, not already accepted)
  - If user is logged in, adds them to team and returns success
  - If user is not logged in, returns signup link with token pre-filled
- [ ] 5.3 Create API endpoint `POST /api/teams/{teamId}/invites/{inviteId}/resend` that:
  - Validates user is OWNER or ADMIN
  - Resets expiration to 7 days from now
  - Generates new token (or reuses existing)
  - Sends new email
  - Returns success message
- [ ] 5.4 Integrate invite token into signup flow: `POST /api/auth/signup` accepts optional `inviteToken` parameter
  - If provided and valid, auto-add user to invited team after account creation
  - If provided and invalid/expired, show warning but allow signup to continue
- [ ] 5.5 Add integration tests for invite flow (happy path, expired invite, signup with invite)

---

## 6. Frontend Integration

- [ ] 6.1 Create "Forgot Password" page/modal that accepts email and submits to `POST /api/auth/forgot-password`
  - Shows success message "Check your email for reset link"
- [ ] 6.2 Create "Reset Password" page that accepts token from URL and submits new password to `POST /api/auth/reset-password`
  - Handles invalid/expired token gracefully
- [ ] 6.3 Update signup page to accept `inviteToken` URL parameter and pass to backend
  - Show context "Joining team [name]" if invite is valid
- [ ] 6.4 Create team invite modal/form in team settings
  - Input for invitee email
  - Button to send invite
  - Success/error messages
- [ ] 6.5 Add "Resend" button in team members view for pending invites

---

## 7. Testing & Verification

- [ ] 7.1 Manual test: docker-compose up, mailpit web UI accessible, SMTP listens on 1025
- [ ] 7.2 Manual test: password reset flow end-to-end (forgot password → email in Mailpit → click link → reset → logged in)
- [ ] 7.3 Manual test: team invite flow end-to-end (invite user → email in Mailpit → accept → joined)
- [ ] 7.4 Manual test: rate limiting on password reset (request twice in 15 min, second rejected)
- [ ] 7.5 Manual test: expired token handling (wait for token to expire, try to reset, rejected)
- [ ] 7.6 Run all tests: `pnpm test` passes
- [ ] 7.7 Build succeeds: `pnpm build` with no errors

---

## 8. Documentation & Deployment Config

- [ ] 8.1 Update `.env.example` with email provider options (mailpit, sendgrid, aws-ses, smtp)
- [ ] 8.2 Add README section on local email testing with Mailpit
- [ ] 8.3 Add README section on production email configuration (SendGrid API key example, AWS SES setup)
- [ ] 8.4 Document rate limiting strategy for password reset and invites
- [ ] 8.5 Ensure deployment target (Vercel, Render, etc.) has email env vars configured
