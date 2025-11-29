## MODIFIED Requirements

### Requirement: Password Recovery/Reset
Users SHALL be able to reset their password via email using a time-limited reset token sent to their email address.

#### Scenario: Password reset link generation
- **WHEN** user requests password reset (POST `/api/auth/forgot-password`)
- **THEN** a reset token is generated with 1-hour expiration
- **AND** the token is stored in `PasswordResetToken` table linked to the user
- **AND** password reset email is sent to the user with reset link containing the token
- **AND** email is sent asynchronously (fire-and-forget)
- **AND** user sees success message "Check your email for reset link" regardless of email success

#### Scenario: Password reset completion
- **WHEN** user visits reset link with valid token (GET `/api/auth/reset-password?token=<token>`)
- **THEN** token is verified against `PasswordResetToken` table
- **AND** token expiration (1 hour) is checked
- **AND** if valid, user can enter new password (POST `/api/auth/reset-password`)
- **AND** password is updated, token is consumed (marked as used), and user is logged in or redirected to login

#### Scenario: Reset token expiration
- **WHEN** user attempts to reset with expired token
- **THEN** system returns error "Link expired, request a new reset"
- **AND** user can request another reset

#### Scenario: Invalid token rejection
- **WHEN** token is invalid or already consumed
- **THEN** system returns 404 or 401 error
- **AND** user sees "Invalid or expired link"

---

## ADDED Requirements

### Requirement: Rate Limiting for Password Reset
The system SHALL limit password reset requests per user to prevent abuse by enforcing a 15-minute cooldown between requests.

#### Scenario: Rate limit on reset requests
- **WHEN** user requests password reset
- **THEN** system checks if user has requested reset in the last 15 minutes
- **AND** if yes, return error "Please wait before requesting another reset"
- **AND** if no, allow request and send email

#### Scenario: Multiple reset tokens per user
- **WHEN** user requests reset while a valid token already exists
- **THEN** the new request generates a new token
- **AND** previous unexpired tokens remain valid (user can use any of them)
