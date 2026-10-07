# Survey JSON Contract

## Overview

Defines the strict JSON schema for survey configurations. Surveys are data-only; any configuration that doesn't match this schema must fail closed with a clear error message. This contract is enforced by the validators in `src/app/core/validators`.

## Core Structure

```json
{
  "id": "survey-unique-identifier",
  "title": "Human-readable survey title",
  "description": "Optional survey description",
  "pages": [
    {
      "id": "page-unique-identifier", 
      "title": "Page title",
      "questions": [
        {
          "id": "question-unique-identifier",
          "type": "radio|checkbox|textbox|textarea|rating|satisfaction",
          "title": "Question text",
          "description": "Optional question description",
          "required": true|false,
          "order": 0,
          "validation": {
            "minSelections": number,
            "maxSelections": number,
            "minLength": number,
            "maxLength": number,
            "ratingRange": {
              "min": number,
              "max": number
            }
          },
          "options": [
            {
              "id": "option-unique-identifier",
              "label": "Option text",
              "value": "option-value"
            }
          ],
          "attachments": {
            "enabled": true|false,
            "maxFiles": 0|1|2|3,
            "acceptedTypes": ["mime/type", "extension"],
            "maxSizeBytes": 10485760
          }
        }
      ]
    }
  ]
}
```

## Required Fields

- `id`: Unique string identifier for the survey
- `title`: Human-readable survey title
- `pages`: Array of page objects

## Field Rules

### Page Object Rules

- `id`: Unique string identifier for the page
- `title`: Page title (optional)
- `questions`: Array of question objects in display order

### Question Object Rules

#### Type Validation
- Must be one of: `radio`, `checkbox`, `textbox`, `textarea`, `rating`, `satisfaction`
- Each type has specific requirements:
  
  **Radio Type**:
  - Must have `options` array with at least 2 options
  - Single selection implied
  
  **Checkbox Type**:
  - Must have `options` array with at least 2 options
  - `validation.minSelections` and `validation.maxSelections` define selection rules
  
  **Textbox Type**:
  - No options required
  - `validation.minLength` and `validation.maxLength` define length rules
  
  **Textarea Type**:
  - No options required
  - `validation.minLength` and `validation.maxLength` define length rules
  
  **Rating Type**:
  - No options required
  - `validation.ratingRange.min` and `validation.ratingRange.max` define scale
  
  **Satisfaction Type**:
  - No options required
  - `validation.ratingRange.min` and `validation.ratingRange.max` define scale

#### Validation Object Rules

**For checkbox questions only**:
- `minSelections`: Integer 0-3, defines minimum required selections
- `maxSelections`: Integer 0-3, defines maximum allowed selections

**For text-based questions only**:
- `minLength`: Integer >= 0, defines minimum characters
- `maxLength`: Integer >= minLength, defines maximum characters

**For rating/satisfaction questions only**:
- `ratingRange.min`: Integer defining minimum value
- `ratingRange.max`: Integer defining maximum value

#### Options Array Rules

For question types that use options (radio, checkbox):
- Must have at least 2 options
- Each option must have:
  - `id`: Unique string identifier
  - `label`: Human-readable option text
  - `value`: String value for storage

#### Attachments Object Rules

- `enabled`: Boolean indicating if attachments are allowed
- `maxFiles`: Integer 0-3 defining maximum files per question
- `acceptedTypes`: Array of MIME types and/or file extensions
- `maxSizeBytes`: Integer defining maximum file size in bytes (max: 10MB = 10485760)

## Validation Rules

### JSON Schema Validation

The JSON must strictly adhere to the schema above. Any deviation results in validation failure.

### Content Validation Rules

1. **Unknown Fields**: Any field not in the schema causes validation failure
2. **Unknown Question Types**: Any question type not in the list causes validation failure
3. **Broken References**: Invalid page IDs or question IDs cause validation failure
4. **Required Fields Missing**: Any required field in the schema causes validation failure
5. **Option Validation**: Questions with option types must have valid options
6. **Attachment Validation**: Questions with enabled attachments must have valid attachment configuration

### Validation Error Handling

When validation fails:
- The application MUST show the configuration-error screen
- Error messages MUST be actionable
- NO survey content should be rendered
- The error should indicate what's specifically invalid (e.g., "Invalid question type 'invalid-type'")

## Example Valid Surveys

### Minimal Survey

```json
{
  "id": "customer-feedback",
  "title": "Customer Feedback",
  "pages": [
    {
      "id": "page1",
      "title": "About You",
      "questions": [
        {
          "id": "q1",
          "type": "radio",
          "title": "How would you rate us?",
          "required": true,
          "options": [
            { "id": "opt1", "label": "Excellent", "value": "excellent" },
            { "id": "opt2", "label": "Good", "value": "good" },
            { "id": "opt3", "label": "Poor", "value": "poor" }
          ]
        }
      ]
    }
  ]
}
```

### Full Survey with All Features

```json
{
  "id": "complete-survey",
  "title": "Complete Survey",
  "description": "A comprehensive survey demonstrating all features",
  "pages": [
    {
      "id": "page1",
      "title": "Personal Information",
      "questions": [
        {
          "id": "q1",
          "type": "radio",
          "title": "Gender",
          "required": true,
          "options": [
            { "id": "m", "label": "Male", "value": "male" },
            { "id": "f", "label": "Female", "value": "female" },
            { "id": "o", "label": "Other", "value": "other" }
          ]
        }
      ]
    },
    {
      "id": "page2",
      "title": "Experience",
      "questions": [
        {
          "id": "q2",
          "type": "checkbox",
          "title": "Select all that apply",
          "required": true,
          "validation": {
            "minSelections": 2,
            "maxSelections": 3
          },
          "options": [
            { "id": "exp1", "label": "Feature A", "value": "a" },
            { "id": "exp2", "label": "Feature B", "value": "b" },
            { "id": "exp3", "label": "Feature C", "value": "c" },
            { "id": "exp4", "label": "Feature D", "value": "d" }
          ]
        }
      ]
    }
  ]
}
```

## Compliance Requirements

1. **Principle I - JSON-Driven Domain Contract**: All surveys MUST conform to this schema. Any non-conforming JSON MUST fail validation and show the configuration-error screen.
2. **Principle II - Feature Isolation**: This contract is independent of application code changes.
3. **Principle III - Validation Before Navigation**: Survey JSON MUST be validated before any page renders.
4. **Principle V - Accessible, Responsive, On-Brand UX**: Error messages must be accessible and clear.