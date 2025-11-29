## ADDED Requirements
### Requirement: Email Authentication
The system SHALL allow users to sign up and log in with email/password enforcing email format, unique email, and password length 6-100 characters with 24h session/token expiry.

#### Scenario: Successful signup and auto-login
- **WHEN** a user submits name (1-50 chars), unique email, and valid password
- **THEN** the account is created and the user is signed in or redirected to login

#### Scenario: Failed login with wrong password
- **WHEN** a user enters an existing email with an incorrect password
- **THEN** the system denies access and shows "Email or password is incorrect"

### Requirement: Password Reset
The system SHALL let users request a password reset email containing a 1-hour token and set a new password.

#### Scenario: Reset via emailed link
- **WHEN** a user submits their email and follows the reset link within 1 hour
- **THEN** they can set a new valid password and sign in

### Requirement: Google OAuth
The system SHALL support Google OAuth as a distinct login method that auto-creates accounts when first used.

#### Scenario: First-time Google login
- **WHEN** a user completes Google OAuth and no local account exists
- **THEN** a new user is created and signed in using Google as the auth method

### Requirement: Profile Management
The system SHALL let authenticated users view and edit name (1-50 chars) and profile image (URL or upload), reflecting changes immediately.

#### Scenario: Update profile image
- **WHEN** a user uploads or provides a URL for a new profile image
- **THEN** the profile view shows the updated image without re-login

### Requirement: Password Change
The system SHALL let authenticated email/password users change their password after verifying the current one; OAuth-only users cannot change passwords.

#### Scenario: Change password with verification
- **WHEN** a user enters current password plus matching new/confirm passwords meeting length rules
- **THEN** the password is updated; otherwise errors show for mismatches or wrong current password

### Requirement: Account Deletion
The system SHALL allow users to soft delete their account after re-confirming credentials (OAuth users confirm action) and only if they do not own teams.

#### Scenario: Delete without owned teams
- **WHEN** a user without owned teams confirms deletion
- **THEN** their account is soft deleted; if teams are owned, the system blocks deletion and instructs to transfer or delete teams first
