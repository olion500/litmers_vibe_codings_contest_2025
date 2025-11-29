## ADDED Requirements
### Requirement: Project Lifecycle
The system SHALL let team members create projects (name 1-100 chars, description up to 2000, optional markdown), view lists, update, archive/restore, favorite, and soft delete; limit 15 projects per team.

#### Scenario: Create project within limits
- **WHEN** a user in a team creates a project and the team has fewer than 15 projects
- **THEN** the project is created with owner set to creator and visible to team members

#### Scenario: Archive and restore
- **WHEN** a permitted user archives a project
- **THEN** the project is hidden or separated from active lists, issues become read-only, and it can be restored to active state

#### Scenario: Favorite per user
- **WHEN** a user toggles favorite on a project
- **THEN** their list shows favorites first, then by creation date descending

### Requirement: Project Detail View
The system SHALL show project info, issue stats by status, and an issue list/kanban tab within the project detail page.

#### Scenario: View project detail
- **WHEN** a team member opens a project
- **THEN** they see name, description, status counts, and can switch between kanban and list views of project issues
