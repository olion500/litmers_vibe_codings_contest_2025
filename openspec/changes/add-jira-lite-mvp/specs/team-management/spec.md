## ADDED Requirements
### Requirement: Team Lifecycle
The system SHALL let authenticated users create teams (name 1-50 chars), update names, and soft delete teams with cascade soft delete of projects/issues/comments; OWNER cannot leave, only delete.

#### Scenario: Create team
- **WHEN** a logged-in user submits a valid team name
- **THEN** a team is created with that user as OWNER and TeamMember entry recorded

#### Scenario: Delete team as owner
- **WHEN** the OWNER deletes the team
- **THEN** the team and its child entities are soft deleted and restorable within 30 days (restore optional)

### Requirement: Membership & Invites
The system SHALL support inviting members by email with 7-day expiry, resend updating expiry, and joining on accept or auto-join on signup; invite email sending is required.

#### Scenario: Invite acceptance
- **WHEN** an invited user accepts before expiry
- **THEN** they become a MEMBER of the team; expired invites cannot be used

### Requirement: Roles and Member Management
The system SHALL enforce OWNER/ADMIN/MEMBER roles with permissions: OWNER/ADMIN manage members, OWNER transfers ownership, OWNER/ADMIN kick (ADMIN cannot kick OWNER/ADMIN), MEMBER/ADMIN can leave, OWNER cannot leave.

#### Scenario: Role change by owner
- **WHEN** the OWNER promotes a MEMBER to ADMIN or transfers ownership to an ADMIN
- **THEN** roles update accordingly while ensuring exactly one OWNER remains

### Requirement: Team Activity Log
The system SHALL record and list team events (join/leave/kick, role changes, project create/delete/archive, team updates) in chronological order with pagination or infinite scroll.

#### Scenario: View paginated activity
- **WHEN** a team member opens the activity log and scrolls
- **THEN** events load in order with performer, target, content, and timestamp
