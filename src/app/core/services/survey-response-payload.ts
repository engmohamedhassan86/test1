/**
 * Building the one payload — T059, `contracts/response-submission.md` §2 and §8.1.
 *
 * Pure, and not `@Injectable`: it has no dependency (`plan.md` §5.1). Everything effectful
 * happens before it is called — the ids are minted by `IdFactoryService` and the bytes are
 * encoded by `AttachmentCodecService`, so `submit`'s order is validate → encode → build →
 * call and nothing is encoded for a submission validation blocked.
 *
 * **It validates nothing** (`data-model.md` §10). By the time it runs, `validateSurvey` has
 * already passed over every page.
 *
 * Four rules the contract fixes and this function is the only place that applies:
 *
 * 1. `answers` is in **survey page order, then question order within the page** — not in
 *    the order the respondent answered (FR-035, FR-063);
 * 2. an unanswered optional question is **omitted**, never sent as `null`;
 * 3. a checkbox `value` is in **the question's option order**, not selection order;
 * 4. the `attachments` key is **absent** when the question accepted no file — never `null`
 *    and never `[]`.
 *
 * And §8.1's resolution of research D16: a question with at least one accepted attachment
 * but no value **is** included, carrying the type's empty value. Dropping it would lose
 * evidence the respondent was told had been accepted.
 */

import { assertNever } from '../models/assert-never';
import type { AnswerMap, AttachmentMap, SessionAttachment } from '../models/answer.model';
import type { AttachmentId, ClientSubmissionId } from '../models/branded';
import type {
  AnswerEntry,
  AttachmentDescriptor,
  SurveyResponse,
} from '../models/survey-response.model';
import type { Question, Survey } from '../models/survey.model';
import { isNonEmpty } from '../models/branded';

/** The base64 `content` of each held attachment, keyed by its `AttachmentId`. */
export type EncodedAttachments = ReadonlyMap<AttachmentId, string>;

/** The two values `submit` mints before it builds. */
export interface SubmissionIdentity {
  readonly clientSubmissionId: ClientSubmissionId;
  /** ISO 8601 UTC, taken when this attempt's Submit was activated. */
  readonly submittedAt: string;
}

export function buildSurveyResponse(
  survey: Survey,
  answers: AnswerMap,
  attachments: AttachmentMap,
  encoded: EncodedAttachments,
  ids: SubmissionIdentity,
): SurveyResponse {
  const entries: AnswerEntry[] = [];

  // Rule 1: the loops are the order. Page order outside, question order inside.
  for (const page of survey.pages) {
    for (const question of page.questions) {
      const entry = answerEntryFor(question, answers, attachments, encoded);
      if (entry !== null) {
        entries.push(entry);
      }
    }
  }

  return {
    surveyKey: survey.key,
    clientSubmissionId: ids.clientSubmissionId,
    submittedAt: ids.submittedAt,
    answers: entries,
  };
}

function answerEntryFor(
  question: Question,
  answers: AnswerMap,
  attachments: AttachmentMap,
  encoded: EncodedAttachments,
): AnswerEntry | null {
  const answer = answers.get(question.id);
  const held = attachments.get(question.id) ?? [];

  // Rule 2, widened by §8.1: omitted only when there is neither a value nor a file.
  if (answer === undefined && held.length === 0) {
    return null;
  }

  const value = answer === undefined ? emptyValueFor(question) : valueOf(question, answer.value);
  const descriptors = held.map((attachment) => descriptorFor(attachment, encoded));

  // Rule 4: the key is absent, not `null` and not `[]`. `isNonEmpty` is what makes the
  // `NonEmpty<AttachmentDescriptor>` on `AnswerEntry` honest without a cast.
  return isNonEmpty(descriptors)
    ? { questionId: question.id, type: question.type, value, attachments: descriptors }
    : { questionId: question.id, type: question.type, value };
}

/**
 * Rule 3 lives here: a stored checkbox answer is already in option order because
 * `setAnswer` normalises it on the way in, so this re-states the type rather than
 * re-sorting. The other five types carry their value through unchanged.
 */
function valueOf(
  question: Question,
  value: string | number | readonly string[],
): AnswerEntry['value'] {
  switch (question.type) {
    case 'checkbox':
      return Array.isArray(value) ? [...value] : [String(value)];
    case 'radio':
    case 'textbox':
    case 'textarea':
    case 'rating':
    case 'satisfaction':
      return value;
  }
  return assertNever(question);
}

/**
 * §8.1: the type's empty value for an attachment-only question. Only the two text types
 * can reach this — the other four have no attachment policy in any valid config that also
 * leaves them unanswerable — but the switch is exhaustive so a seventh type is a build
 * failure here too.
 */
function emptyValueFor(question: Question): AnswerEntry['value'] {
  switch (question.type) {
    case 'textbox':
    case 'textarea':
      return '';
    case 'radio':
      return '';
    case 'checkbox':
      return [];
    case 'rating':
    case 'satisfaction':
      return 0;
  }
  return assertNever(question);
}

function descriptorFor(
  attachment: SessionAttachment,
  encoded: EncodedAttachments,
): AttachmentDescriptor {
  return {
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    // An id missing from `encoded` would be a caller bug: `submit` encodes every held
    // attachment before it builds. `''` keeps the function total rather than throwing
    // inside a pure builder, and the round-trip assertion in T061 is what catches it.
    content: encoded.get(attachment.id) ?? '',
  };
}
