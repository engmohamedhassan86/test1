/**
 * Typed builders for normalised `Survey` values, used by the validator, service and
 * component specs.
 *
 * These construct the **post-validation** model directly, which is exactly what a test
 * needs: the authored-JSON side is covered by `survey-config.validator.spec.ts` and by
 * the Survey Content Author's fixture contract test, and a component spec should not have
 * to go through a validator to get a question to render.
 *
 * Every builder fills in the fields the validator would have normalised — `description`
 * `null`, `required` false, `attachments` `null` — so no spec repeats those defaults.
 *
 * Placed in `__fixtures__/` to match the convention the Survey Content Author set in
 * `core/validators/__fixtures__/`.
 */

import { brand } from '../branded';
import type {
  AtLeastTwo,
  AttachmentId,
  NonEmpty,
  OptionValue,
  PageId,
  QuestionId,
  SurveyKey,
} from '../branded';
import type {
  AcceptedFileType,
  AttachmentPolicy,
  CheckboxQuestion,
  Question,
  RadioQuestion,
  RatingQuestion,
  SatisfactionQuestion,
  Survey,
  SurveyOption,
  SurveyPage,
  TextareaQuestion,
  TextboxQuestion,
} from '../survey.model';

export function questionId(value: string): QuestionId {
  return brand<QuestionId>(value);
}

/**
 * Attachment ids are minted by `IdFactoryService` at runtime, so a spec that needs to
 * name one it never held — the "remove an attachment this question does not have" path —
 * has no other way to produce one. It is a distinct builder rather than a reuse of
 * `questionId` precisely because the brands are not interchangeable.
 */
export function attachmentId(value: string): AttachmentId {
  return brand<AttachmentId>(value);
}

export function optionValue(value: string): OptionValue {
  return brand<OptionValue>(value);
}

export function option(id: string, label: string, value: string = id): SurveyOption {
  return { id, label, value: optionValue(value) };
}

/** Two options is the contract minimum, so the default pair is the smallest legal set. */
export function twoOptions(): AtLeastTwo<SurveyOption> {
  return [option('a', 'Option A'), option('b', 'Option B')];
}

export function attachmentPolicy(overrides: Partial<AttachmentPolicy> = {}): AttachmentPolicy {
  const acceptedTypes: NonEmpty<AcceptedFileType> = overrides.acceptedTypes ?? [
    'image/png',
    'image/jpeg',
    'application/pdf',
  ];
  return {
    maxFiles: overrides.maxFiles ?? 3,
    acceptedTypes,
    maxSizeBytes: overrides.maxSizeBytes ?? 5_242_880,
  };
}

interface CommonOverrides {
  readonly id?: string;
  readonly title?: string;
  readonly description?: string | null;
  readonly required?: boolean;
  readonly attachments?: AttachmentPolicy | null;
}

function common(
  overrides: CommonOverrides,
  fallbackId: string,
  fallbackTitle: string,
): {
  readonly id: QuestionId;
  readonly title: string;
  readonly description: string | null;
  readonly required: boolean;
  readonly attachments: AttachmentPolicy | null;
} {
  return {
    id: questionId(overrides.id ?? fallbackId),
    title: overrides.title ?? fallbackTitle,
    description: overrides.description ?? null,
    required: overrides.required ?? false,
    attachments: overrides.attachments ?? null,
  };
}

export function radioQuestion(
  overrides: CommonOverrides & { readonly options?: AtLeastTwo<SurveyOption> } = {},
): RadioQuestion {
  return {
    ...common(overrides, 'q_radio', 'Pick one'),
    type: 'radio',
    options: overrides.options ?? twoOptions(),
  };
}

export function checkboxQuestion(
  overrides: CommonOverrides & {
    readonly options?: AtLeastTwo<SurveyOption>;
    readonly minSelections?: number;
    readonly maxSelections?: number;
  } = {},
): CheckboxQuestion {
  const options = overrides.options ?? twoOptions();
  return {
    ...common(overrides, 'q_checkbox', 'Pick some'),
    type: 'checkbox',
    options,
    minSelections: overrides.minSelections ?? 0,
    maxSelections: overrides.maxSelections ?? options.length,
  };
}

export function textboxQuestion(
  overrides: CommonOverrides & { readonly minLength?: number; readonly maxLength?: number } = {},
): TextboxQuestion {
  return {
    ...common(overrides, 'q_textbox', 'Your name'),
    type: 'textbox',
    minLength: overrides.minLength ?? 0,
    maxLength: overrides.maxLength ?? 255,
  };
}

export function textareaQuestion(
  overrides: CommonOverrides & { readonly minLength?: number; readonly maxLength?: number } = {},
): TextareaQuestion {
  return {
    ...common(overrides, 'q_textarea', 'Anything to add?'),
    type: 'textarea',
    minLength: overrides.minLength ?? 0,
    maxLength: overrides.maxLength ?? 2000,
  };
}

export function ratingQuestion(
  overrides: CommonOverrides & {
    readonly scale?: { readonly min: number; readonly max: number };
  } = {},
): RatingQuestion {
  return {
    ...common(overrides, 'q_rating', 'Rate the delivery'),
    type: 'rating',
    scale: overrides.scale ?? { min: 1, max: 5 },
  };
}

export function satisfactionQuestion(overrides: CommonOverrides = {}): SatisfactionQuestion {
  return {
    ...common(overrides, 'q_satisfaction', 'How was today?'),
    type: 'satisfaction',
  };
}

export function page(
  id: string,
  title: string,
  questions: readonly Question[],
  description: string | null = null,
): SurveyPage {
  return { id: brand<PageId>(id), title, description, questions };
}

export function survey(
  pages: NonEmpty<SurveyPage>,
  overrides: {
    readonly key?: string;
    readonly title?: string;
    readonly description?: string | null;
  } = {},
): Survey {
  return {
    key: brand<SurveyKey>(overrides.key ?? 'mini-pulse'),
    title: overrides.title ?? 'Mini Pulse',
    description: overrides.description ?? null,
    pages,
  };
}

/** One page, one question — the smallest survey most specs need. */
export function singleQuestionSurvey(question: Question): Survey {
  return survey([page('p1', 'Only page', [question])]);
}

/**
 * A structural stand-in for the default `customer-feedback` fixture: the same eight
 * questions over the same four pages, so a component spec can exercise the real shape
 * without reading the file from disk. The authored file itself is asserted by the
 * Survey Content Author's `survey-fixtures.contract.spec.ts`.
 */
export function customerFeedbackSurvey(): Survey {
  return survey(
    [
      page(
        'about-you',
        'About You',
        [
          textboxQuestion({
            id: 'q_name',
            title: 'What should we call you?',
            description: 'A first name is plenty.',
            required: true,
            minLength: 2,
            maxLength: 80,
          }),
          radioQuestion({
            id: 'q_segment',
            title: 'Which of these describes you?',
            required: true,
            options: [
              option('seg-new', 'A new customer', 'new'),
              option('seg-returning', 'A returning customer', 'returning'),
              option('seg-business', 'A business customer', 'business'),
            ],
          }),
        ],
        'Who we are hearing from.',
      ),
      page('your-experience', 'Your Experience', [
        satisfactionQuestion({
          id: 'q_satisfaction',
          title: 'How satisfied were you with your order?',
          required: true,
        }),
        checkboxQuestion({
          id: 'q_liked',
          title: 'What did you like?',
          description: 'Choose between one and three things.',
          required: true,
          minSelections: 1,
          maxSelections: 3,
          options: [
            option('liked-delivery', 'Delivery speed', 'delivery'),
            option('liked-packaging', 'Packaging', 'packaging'),
            option('liked-support', 'Support', 'support'),
            option('liked-price', 'Price', 'price'),
            option('liked-quality', 'Quality', 'quality'),
          ],
        }),
        ratingQuestion({
          id: 'q_delivery',
          title: 'How would you rate the delivery?',
          description: 'One star is poor, five stars is excellent.',
          scale: { min: 1, max: 5 },
        }),
      ]),
      page('supporting-files', 'Supporting Files', [
        textareaQuestion({
          id: 'q_evidence',
          title: 'Anything we should see?',
          description: 'Tell us what happened, and add a photo or a receipt if that helps.',
          maxLength: 1000,
          attachments: attachmentPolicy(),
        }),
      ]),
      page('final-thoughts', 'Final Thoughts', [
        textareaQuestion({
          id: 'q_comments',
          title: 'Anything else?',
          description: 'Say as much or as little as you like.',
          maxLength: 2000,
        }),
        radioQuestion({
          id: 'q_recommend',
          title: 'Would you recommend us?',
          required: true,
          options: [
            option('rec-yes', 'Yes', 'yes'),
            option('rec-no', 'No', 'no'),
            option('rec-unsure', 'Not sure', 'unsure'),
          ],
        }),
      ]),
    ],
    {
      key: 'customer-feedback',
      title: 'Customer Feedback',
      description: 'Four short pages about your recent order.',
    },
  );
}
