# Response Submission Contract

## Overview

Defines the strict interface for survey response submissions. All survey responses MUST follow this contract, enabling the transport layer to change without affecting business logic. This contract is enforced by the services in `src/app/core/services`.

## Submission Structure

```json
{
  "surveyId": "survey-unique-identifier",
  "answers": [
    {
      "questionId": "question-unique-identifier",
      "value": "answer-value",
      "attachments": [
        {
          "name": "filename.ext",
          "type": "mime/type",
          "size": 1234567,
          "url": "base64-encoded-file-content"
        }
      ]
    }
  ],
  "submittedAt": "2026-10-07T10:30:00.000Z"
}
```

## Required Fields

- `surveyId`: The unique identifier of the survey being submitted
- `answers`: Array of answer objects for each answered question
- `submittedAt`: ISO 8601 timestamp of submission

## Field Rules

### Answer Object Rules

Each answer object represents a single question's response and must contain:

#### Core Fields
- `questionId`: The unique identifier of the question being answered (must match a question from the survey JSON)
- `value`: The answer value, format depends on question type:
  
  **For radio questions:**
  - String value matching one of the option values from the survey JSON
  
  **For checkbox questions:**
  - Array of string values matching selected option values
  
  **For textbox/textarea questions:**
  - String containing the text input
  
  **For rating/satisfaction questions:**
  - Number within the defined rating range (min-max from validation)

#### Attachments Array Rules

For questions with `attachments.enabled: true`:

- Array of attachment objects (can be empty if no files uploaded)
- Maximum 3 attachments per question (enforced by validation)
- Each attachment must contain:
  
  - `name`: Original filename with extension
  - `type`: MIME type of the file
  - `size`: File size in bytes (must be <= maxSizeBytes from survey JSON)
  - `url`: Base64-encoded file content

### Validation Rules

#### Answer Validation

1. **Question ID Match**: `questionId` MUST correspond to a question in the survey JSON
2. **Value Format**: `value` must match the expected format for the question type
   - Radio: String value
   - Checkbox: Array of strings
   - Textbox/Textarea: String
   - Rating/Satisfaction: Number
3. **Required Fields**: All questions marked `required: true` in the survey JSON MUST have corresponding answer objects
4. **Missing Questions**: Answers for questions not in the survey JSON cause rejection
5. **Duplicate Answers**: Multiple answers for the same question cause rejection

#### Attachment Validation

1. **File Type**: Attachment `type` MUST be in the acceptedTypes list from the survey JSON
2. **File Size**: Attachment `size` MUST be <= `maxSizeBytes` from the survey JSON
3. **File Count**: Maximum 3 attachments per question (enforced by validation)
4. **Base64 Format**: Attachment `url` must be valid base64-encoded content

### Submission Validation Rules

1. **Survey ID Match**: `surveyId` MUST correspond to a valid survey from the manifest
2. **Question Coverage**: All non-optional questions from the survey MUST have answers
3. **Answer Validity**: All answers MUST pass type-specific validation
4. **Attachment Compliance**: All attachments MUST pass type and size validation
5. **Timestamp Format**: `submittedAt` MUST be valid ISO 8601 format

## Response Submission API

### Endpoint

`POST /api/survey-responses`

### Request Headers

- `Content-Type: application/json`
- `Authorization: Bearer <auth-token>` (if authentication is required)

### Request Body

JSON object following the structure defined above

### Success Response

```json
{
  "success": true,
  "submissionId": "submission-unique-identifier",
  "message": "Survey submitted successfully",
  "submittedAt": "2026-10-07T10:30:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR|AUTHENTICATION_ERROR|SERVER_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "field-name",
        "code": "REQUIRED|MISSING|INVALID|OUT_OF_RANGE",
        "message": "Specific error for this field"
      }
    ]
  },
  "submittedAt": "2026-10-07T10:30:00.000Z"
}
```

## Error Codes and Messages

### VALIDATION_ERROR (400)

- `code`: "VALIDATION_ERROR"
- `message`: "Submission validation failed"
- `details`: Array of field-specific validation errors

**Common validation errors**:
- "Question 'questionId' is required but was not provided"
- "Question 'questionId' has invalid answer format"
- "Question 'questionId' has exceeded maximum file size"
- "Question 'questionId' has unsupported file type"
- "Question 'questionId' requires at least N selections"
- "Question 'questionId' must be answered"

### AUTHENTICATION_ERROR (401)

- `code`: "AUTHENTICATION_ERROR"
- `message`: "Authentication required"
- `details`: Not applicable

### UNAUTHORIZED_ERROR (403)

- `code`: "UNAUTHORIZED_ERROR"
- `message`: "Insufficient permissions"
- `details`: Not applicable

### NOT_FOUND_ERROR (404)

- `code`: "NOT_FOUND_ERROR"
- `message`: "Survey not found"
- `details`: Not applicable

### SERVER_ERROR (500)

- `code`: "SERVER_ERROR"
- `message`: "Internal server error"
- `details`: Not applicable

## State Management

### Submission States

The application tracks survey submission through these states:

1. **editing**: User is actively filling out the survey
2. **validation-error**: Pre-submission validation failed
3. **submitting**: Submission in progress
4. **submitted**: Submission successfully completed
5. **submission-error**: Submission failed after initial attempt

### State Transitions

- **editing → validation-error**: When pre-submission validation fails
- **editing → submitting**: When user clicks Submit and all validation passes
- **submitting → submitted**: When API returns success
- **submitting → submission-error**: When API returns error
- **submission-error → editing**: When user chooses to retry with corrected answers

### State-Specific Behavior

#### validation-error State
- Show all validation errors with first invalid field focused
- Prevent navigation and submission
- Allow editing of invalid fields
- Preserve all user answers

#### submitting State
- Show loading indicator
- Disable all controls
- Prevent user interaction
- Do not preserve answers (API may have processed them)

#### submitted State
- Show completion confirmation screen
- Clear all form data from memory
- Provide option to return to survey catalog

#### submission-error State
- Show error message with retry option
- Preserve all user answers
- Allow editing and resubmission
- Maintain current page navigation state

## Response Handling

### Successful Submission

When the submission succeeds:
1. Application transitions to **submitted** state
2. Completion confirmation screen is shown
3. All answers are cleared from application state
4. User is offered to return to survey catalog

### Failed Submission

When the submission fails:
1. Application transitions to **submission-error** state
2. Error message is displayed with details
3. All user answers are preserved
4. User can retry submission with corrected answers
5. Navigation is disabled until submission succeeds

### Pre-submission Validation

Before submission:
1. All questions are re-validated
2. All attachments are re-validated
3. All pages are checked for completeness
4. Validation errors are shown immediately
5. Submission is only allowed when all validation passes

## Compliance Requirements

1. **Principle I - JSON-Driven Domain Contract**: All submissions MUST conform to this contract. Any non-conforming submission MUST fail validation.
2. **Principle II - Feature Isolation**: This contract is independent of application implementation details.
3. **Principle III - Validation Before Navigation and Before Submit**: All submissions are validated both at the boundary (pre-submission) and during submission.
4. **Principle V - Accessible, Responsive, On-Brand UX**: Error messages must be accessible and clear.

## Testing Considerations

### Contract Tests

The Survey Content Author should write contract tests that verify:
1. Valid submissions are accepted and return success response
2. Invalid submissions are rejected with appropriate error codes
3. Attachment validation works (type and size)
4. Question validation works (required, min/max, ranges)
5. State transitions happen correctly
6. Error messages are properly formatted and accessible

### Integration Tests

Application integration tests should verify:
1. The UI correctly displays validation errors
2. Navigation is blocked when validation fails
3. User experience during submission states
4. Error recovery flows
5. Accessibility compliance for error messages