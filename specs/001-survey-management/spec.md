# Feature Specification: 001-survey-management

**Feature Branch**: `001-survey-management`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: Dynamic survey app that renders multi-page surveys from JSON (survey -> pages -> questions) with radio, checkbox, textbox, textarea, rating and satisfaction question types; validation for required answers, min/max selections, and min/max text length; 0-3 file attachments per question with accepted types and max size; Next/Previous navigation that keeps answers and blocks invalid pages; re-validation of all pages before submit; a typed submission boundary with a simulated adapter (real endpoint /api/survey-responses); a configuration-error screen for invalid JSON; a completion confirmation; and a responsive, accessible UI. Default fixture: a 4-page customer-feedback survey (About You, Your Experience, Supporting Files, Final Thoughts). Surveys are listed in public/survey-manifest.json and served at / and /surveys/:surveyKey.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - View and Complete Survey (Priority: P1)

A viewer can navigate through a survey page by page, answer questions, and submit the completed survey.

**Why this priority**: This is the core functionality that delivers value to users. Without this, there is no purpose to the application.

**Independent Test**: Can be fully tested by navigating through all pages, answering required questions, and submitting successfully. Delivers complete survey completion experience.

**Acceptance Scenarios**:

1. **Given** a valid customer-feedback survey, **When** the viewer loads the survey, **Then** they see the first page with all questions
2. **Given** a viewer is on page 1 with unanswered required questions, **When** they click Next, **Then** navigation is blocked and the first invalid field is focused
3. **Given** a viewer answers all questions on page 1, **When** they click Next, **Then** they see page 2
4. **Given** a viewer completes all pages and clicks Submit, **When** the submission succeeds, **Then** they see a completion confirmation screen

---

### User Story 2 - Validation and Navigation (Priority: P1)

All answers must be validated before navigation and submission, with clear error messaging.

**Why this priority**: Prevents users from losing progress and ensures data quality. Blocking invalid navigation is critical for user experience.

**Independent Test**: Can be fully tested by attempting to navigate with invalid answers and verifying that navigation is blocked with appropriate error messages.

**Acceptance Scenarios**:

1. **Given** a required radio question on page 1 is unanswered, **When** the viewer clicks Next, **Then** the question is marked invalid and focus is set to that field
2. **Given** a checkbox question requires 2 selections but only 1 is made, **When** the viewer attempts to navigate, **Then** an error message indicates the minimum selection requirement
3. **Given** a text question has a minimum length requirement but the answer is too short, **When** the viewer attempts to navigate, **Then** a validation error is displayed
4. **Given** a viewer answers a satisfaction question outside the 1-5 rating range, **When** they attempt to submit, **Then** an error indicates the valid range

---

### User Story 3 - Error Handling and Recovery (Priority: P2)

The application must handle various error scenarios gracefully, including invalid JSON, submission failures, and attachment issues.

**Why this priority**: Critical for robustness and user trust. Errors must be surfaced clearly and recovery paths provided.

**Independent Test**: Can be fully tested by simulating invalid JSON loading, submission failures, and attachment size/type violations.

**Acceptance Scenarios**:

1. **Given** an invalid survey JSON that fails validation, **When** the app attempts to load, **Then** the configuration-error screen is shown with actionable error message
2. **Given** a valid survey but the submission API returns an error, **When** the viewer attempts to submit, **Then** a submission-error state is shown with preserved answers
3. **Given** a viewer tries to upload a file type that's not in the accepted list, **When** they select the file, **Then** an error is shown immediately
4. **Given** a viewer attempts to upload a file larger than the max size, **When** they select the file, **Then** an error is shown immediately

---

### User Story 4 - Survey Catalog and Routes (Priority: P1)

Users can view available surveys from the catalog and navigate to specific surveys by key.

**Why this priority**: Essential for discoverability and multi-survey support. The app must list and access different surveys.

**Independent Test**: Can be fully tested by accessing the catalog route and clicking on survey links, verifying navigation to individual surveys.

**Acceptance Scenarios**:

1. **Given** the viewer visits /, **When** the app loads, **Then** they see a catalog listing all available surveys from public/survey-manifest.json
2. **Given** a viewer clicks on a survey from the catalog, **When** they navigate to /surveys/:surveyKey, **Then** they see the first page of that survey
3. **Given** a viewer visits an unknown survey key, **When** they navigate to /surveys/:unknown, **Then** they see an error page indicating the survey is not found
4. **Given** the app loads with invalid JSON, **When** it fails to load, **Then** the configuration-error screen is shown

---

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when a viewer closes their browser during a survey session?
- How does system handle multiple file uploads with mixed valid/invalid files?
- What happens when the submission API times out?
- How does the system handle network connectivity issues during survey completion?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST render surveys from JSON configuration where each survey contains pages, each page contains questions with specific types (radio, checkbox, textbox, textarea, rating, satisfaction)
- **FR-002**: System MUST validate required fields before navigation and submission, blocking forward progress with focused invalid field
- **FR-003**: System MUST enforce min/max selection rules for checkbox questions (min 0-3 selections based on requirement)
- **FR-004**: System MUST enforce min/max length rules for text and textarea questions
- **FR-005**: System MUST enforce rating and satisfaction question ranges (1-5 scale)
- **FR-006**: System MUST support 0-3 file attachments per question with MIME/type validation and size enforcement (accepted types: image/*, application/pdf; max size: 10MB per file)
- **FR-007**: System MUST provide Next/Previous navigation that preserves answers when navigating back
- **FR-008**: System MUST block Next navigation on invalid pages and re-validate all pages before submit
- **FR-009**: System MUST transition through these states: loading, ready, editing, validation-error, submitting, submitted, submission-error, configuration-error
- **FR-010**: System MUST show configuration-error screen for invalid survey JSON with actionable error message
- **FR-011**: System MUST show completion confirmation screen after successful submission
- **FR-012**: System MUST handle unknown survey keys with appropriate error page
- **FR-013**: System MUST be accessible (WCAG 2.1 AA) with keyboard navigation, screen reader support, and focus management
- **FR-014**: System MUST be responsive and work at 375px and 1280px widths without horizontal scrolling

*Example of marking unclear requirements:*

- **FR-015**: System MUST maintain session state across navigation with proper cleanup
- **FR-016**: System MUST support retry logic for failed submissions

### Key Entities

- **Survey**: A JSON configuration containing metadata and a list of pages
- **Page**: A logical grouping of questions with navigation order
- **Question**: A specific item type (radio, checkbox, textbox, textarea, rating, satisfaction) with validation rules and optional attachments
- **ResponseState**: Application state (loading, ready, editing, validation-error, submitting, submitted, submission-error, configuration-error)

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Users can complete the entire survey flow (all 4 pages) with valid answers in under 5 minutes
- **SC-002**: All required fields are validated before submission with error messages clearly announced to screen readers
- **SC-003**: Invalid navigation attempts are blocked and the first invalid field is focused with visible error indicator
- **SC-004**: File uploads are validated at selection time (type and size) with immediate user feedback
- **SC-005**: Survey JSON validation fails closed - invalid JSON shows configuration-error screen with actionable message
- **SC-006**: Submission failures preserve all user answers and show error with retry option
- **SC-007**: The application is usable at 375px (mobile) and 1280px (desktop) without horizontal scrolling
- **SC-008**: All interactive elements are keyboard accessible with visible focus indicators
- **SC-009**: Validation errors are announced to screen readers via aria-live regions

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- Users have stable internet connectivity for loading surveys and submission
- The default customer-feedback survey fixture is 4 pages: About You, Your Experience, Supporting Files, Final Thoughts
- The application can access the public/survey-manifest.json file for survey listing
- The submission endpoint /api/survey-responses returns appropriate HTTP status codes (200 for success, 4xx for client errors, 5xx for server errors)
- All validation errors must be surfaced to users before submission
- The app should maintain session state across page navigation without requiring page reloads
- File attachments are processed client-side with server-side validation as a secondary check
- The application will be deployed to Vercel and Cloudflare with index fallback routing
