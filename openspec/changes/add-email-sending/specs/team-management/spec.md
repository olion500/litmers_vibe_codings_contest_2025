## MODIFIED Requirements

### Requirement: Invite Member
Team OWNER or ADMIN SHALL be able to invite users to join a team via email invitation with a 7-day expiration period and link-based acceptance.

#### Scenario: Send team invite email
- **WHEN** OWNER or ADMIN invites user via email (POST `/api/teams/{teamId}/invites`)
- **THEN** a `TeamInvite` record is created with 7-day expiration
- **AND** invitation email is sent to the invitee with join link
- **AND** email is sent asynchronously (fire-and-forget)
- **AND** API returns success message "Invitation sent" regardless of email delivery

#### Scenario: Invite email content
- **WHEN** team invite email is composed
- **THEN** email includes:
  - Team name
  - Inviter name
  - Join link with invite token
  - Expiration date (7 days from now)
  - Instructions to accept or create account

#### Scenario: Accept invite from email
- **WHEN** user visits join link from email (GET `/api/teams/{teamId}/invites/{token}`)
- **THEN** if token is valid and not expired:
  - **AND** if user is logged in, they are added to team
  - **AND** if user is not logged in, they are redirected to signup with invite token pre-filled
  - **AND** after signup, user is automatically added to team

#### Scenario: Expired invite rejection
- **WHEN** user attempts to accept expired invite
- **THEN** system returns error "Invitation expired"
- **AND** user is shown "Ask the team owner to send a new invitation"

#### Scenario: Resend invite
- **WHEN** OWNER or ADMIN resends invite to same email (POST `/api/teams/{teamId}/invites/{inviteId}/resend`)
- **THEN** expiration date is reset to 7 days from now
- **AND** new email is sent to the invitee
- **AND** old token is invalidated

#### Scenario: Multiple invites to same email
- **WHEN** user is invited multiple times to the same team
- **THEN** only one active invite exists at a time
- **AND** resending replaces the previous invite

---

## ADDED Requirements

### Requirement: Auto-join on Signup with Invite Token
When a user signs up with a valid invite token from a team invitation email, the system SHALL automatically add them to the invited team without requiring manual acceptance.

#### Scenario: Signup with invite token
- **WHEN** user signs up via link from team invite email (signup with `inviteToken` parameter)
- **THEN** after account creation, user is automatically added to the invited team
- **AND** team invite record is marked as accepted
- **AND** user is logged in and can see the team on dashboard

#### Scenario: Invalid invite token during signup
- **WHEN** user signs up with invalid or expired invite token
- **THEN** signup still succeeds
- **AND** user is not added to team
- **AND** user sees message "Invitation has expired, ask team owner to invite again"
