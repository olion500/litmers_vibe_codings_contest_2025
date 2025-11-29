## ADDED Requirements
### Requirement: AI Summaries and Suggestions
The system SHALL generate AI summary (2-4 sentences) and solution suggestion on button click for issues with descriptions over 10 characters, caching results and invalidating on description change; errors are displayed on API failure.

#### Scenario: Generate summary with cache
- **WHEN** a user clicks "AI Summary" on an issue with description >10 characters and no cached summary
- **THEN** the app calls the LLM, stores the result, and shows it; on subsequent clicks before description change, the cached value is reused

### Requirement: AI Auto-Label Recommendation
The system SHALL recommend up to 3 labels from existing project labels based on issue title/description when the user clicks an AI label button and allow accepting/rejecting suggestions.

#### Scenario: Recommend labels
- **WHEN** a user clicks AI Label Recommendation during issue creation
- **THEN** the system returns suggested labels from the project's label set and the user can apply or ignore them

### Requirement: AI Duplicate Detection
The system SHALL warn about similar existing issues (up to 3) based on title similarity during issue creation (on title completion or button click) while allowing the user to proceed.

#### Scenario: Warn on similar issues
- **WHEN** a user enters a title matching existing issues
- **THEN** a list of similar issues with links is shown; the user may continue creating anyway

### Requirement: AI Comment Summary
The system SHALL summarize discussions for issues with 5+ comments on button click, caching the summary and invalidating when a new comment is added.

#### Scenario: Summarize long discussion
- **WHEN** an issue has at least 5 comments and the user clicks Comment Summary
- **THEN** the system generates a 3-5 sentence summary and key decisions; if a new comment appears, the cached summary expires

### Requirement: AI Rate Limiting
The system SHALL enforce per-user AI rate limits of either 10 requests/minute or 100 requests/day and show remaining quota/time when exceeded.

#### Scenario: Exceed rate limit
- **WHEN** a user triggers AI calls beyond the chosen limit window
- **THEN** further calls are blocked until allowance resets and a message explains remaining time or count
