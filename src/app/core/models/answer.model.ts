/**
 * Session answer and attachment model — `data-model.md` §6.
 *
 * D4: unanswered is *absence* from the answers map. There is no `null` answer, no `''`
 * answer and no `[]` answer — `SurveySessionService.setAnswer` deletes the entry instead
 * of storing an empty one, and the checkbox variant below cannot hold an empty selection.
 */

import type { AttachmentId, NonEmpty, OptionValue, QuestionId } from './branded';
import type { Question, SatisfactionPoint } from './survey.model';

export type Answer =
  | { readonly type: 'radio'; readonly value: OptionValue }
  | { readonly type: 'checkbox'; readonly value: NonEmpty<OptionValue> }
  | { readonly type: 'textbox'; readonly value: string }
  | { readonly type: 'textarea'; readonly value: string }
  | { readonly type: 'rating'; readonly value: number }
  | { readonly type: 'satisfaction'; readonly value: SatisfactionPoint };

/** The answer variant that belongs to a given question member, by discriminant. */
export type AnswerFor<TQuestion extends Question> = Extract<Answer, { type: TQuestion['type'] }>;

/**
 * What a control hands to `setAnswer`. It is deliberately looser than `Answer`: a
 * control supplies raw text or a raw selection, and the normalisation in §6.1 — trim,
 * delete-when-empty, order by option order — is what turns one into the other.
 */
export type AnswerInput =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'option'; readonly value: OptionValue }
  | { readonly kind: 'options'; readonly values: readonly OptionValue[] }
  | { readonly kind: 'point'; readonly value: number };

export type AnswerMap = ReadonlyMap<QuestionId, Answer>;

/**
 * An accepted attachment. D6: the bytes are read once, at selection time, and held for
 * the session, so FR-065's "name, MIME type, size and bytes survive navigation" is a
 * property of this record rather than of a file handle the browser may invalidate.
 */
export interface SessionAttachment {
  readonly id: AttachmentId;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly bytes: Uint8Array;
}

export type AttachmentMap = ReadonlyMap<QuestionId, readonly SessionAttachment[]>;

/** FR-023's ordered checks, plus the read step D6 adds after them. */
export type AttachmentRejectionReason =
  'unaccepted-type' | 'too-large' | 'empty' | 'duplicate' | 'no-free-slot' | 'unreadable';

/** FR-024: one per rejected file, naming the file and the reason. */
export interface AttachmentRejection {
  readonly questionId: QuestionId;
  readonly fileName: string;
  readonly reason: AttachmentRejectionReason;
  /** The respondent-facing text, already formatted by FR-071/FR-072 where needed. */
  readonly message: string;
}

/**
 * A file as the attachment validator sees it, before its bytes are read. Narrower than
 * `File` so the validator stays pure and testable without a DOM.
 */
export interface AttachmentCandidate {
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

/** The result of processing one multi-file selection (FR-024, US3 scenario 4). */
export interface AttachmentSelectionResult {
  readonly accepted: readonly AttachmentCandidate[];
  readonly rejected: readonly AttachmentRejection[];
}
