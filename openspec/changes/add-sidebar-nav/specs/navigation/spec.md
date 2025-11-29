## ADDED Requirements
### Requirement: Sidebar Navigation Shell
The system SHALL provide a shared sidebar navigation shell for authenticated pages, listing key destinations and rendered consistently across core routes.

#### Scenario: Sidebar on authenticated pages
- **WHEN** a signed-in user visits Projects, Teams, Profile, or issue pages
- **THEN** a sidebar is visible with navigation items without requiring page-specific links.

### Requirement: Responsive Sidebar Toggle
The system SHALL allow the sidebar to collapse on small screens via a toggle or drawer while keeping navigation accessible.

#### Scenario: Mobile toggle
- **WHEN** the viewport is small
- **THEN** a toggle control opens/closes the navigation, and links remain reachable.

### Requirement: Navigation Items and Active State
The system SHALL include links for Home, Projects, Teams, Profile, and a Sign out action, and highlight the active page.

#### Scenario: Active link indication
- **WHEN** a user is on a route represented in the sidebar
- **THEN** that link is visually marked active.

#### Scenario: Sign out from sidebar
- **WHEN** a user clicks Sign out in the sidebar
- **THEN** the existing sign-out action runs and redirects to login.
