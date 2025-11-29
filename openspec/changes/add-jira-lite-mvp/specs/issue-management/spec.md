## ADDED Requirements
### Requirement: Issue Lifecycle
The system SHALL let project members create issues (title 1-200, description up to 5000, optional assignee from team, due date, priority default MEDIUM, labels) with default status Backlog and soft delete rights for owner, project owner, team OWNER/ADMIN.

#### Scenario: Create issue within limits
- **WHEN** a user creates an issue in a project with fewer than 200 issues and selects an assignee from team members
- **THEN** the issue is saved with status Backlog and owner = creator

### Requirement: Issue Attributes and Limits
The system SHALL support priorities (HIGH/MEDIUM/LOW), labels per project (max 20, color hex, 5 per issue), subtasks (max 20 per issue), and display of all attributes in issue detail.

#### Scenario: Add labels and subtasks
- **WHEN** a user assigns up to 5 existing project labels and creates subtasks under 20 items
- **THEN** the issue detail shows labels and subtask progress; additional labels beyond limits are rejected

### Requirement: Status Management
The system SHALL allow status changes via drag/drop or detail view across Backlog/In Progress/Done and custom statuses; custom statuses per project up to 5 with color and position; invalid status moves are rejected.

#### Scenario: Move issue across columns
- **WHEN** a user drags an issue from Backlog to In Progress
- **THEN** the status updates immediately and ordering is preserved in the destination column

### Requirement: Search and Filtering
The system SHALL provide text search on title, filters by status, assignee, priority, label, due date presence/range, and sorting by creation, due date, priority, or last modified.

#### Scenario: Filter by assignee and status
- **WHEN** a user filters issues for assignee X and status In Progress
- **THEN** only matching issues are listed, sorted per selected order

### Requirement: Change History
The system SHALL track changes to status, assignee, priority, title, and due date with previous/new values, changer, and timestamp.

#### Scenario: View change history
- **WHEN** a user opens an issue's history
- **THEN** they see chronological entries of tracked field changes with who changed them
