/**
 * The submission boundary — `data-model.md` §9 and `contracts/response-submission.md`
 * §8–§9. The contract is authoritative on behaviour; this is the surface that carries it.
 */

import type { ClientSubmissionId, NonEmpty, QuestionId, SurveyKey } from './branded';
import type { QuestionType } from './survey.model';

/** Contract §2 attachment entry. `content` is base64; decoded length equals `sizeBytes`. */
export interface AttachmentDescriptor {
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly content: string;
}

/** Contract §2 answer entry. `value`'s shape is fixed by `type`. */
export interface AnswerEntry {
  readonly questionId: QuestionId;
  readonly type: QuestionType;
  readonly value: string | number | readonly string[];
  /** Omitted entirely when the question accepted no file. Never `null`, never `[]`. */
  readonly attachments?: NonEmpty<AttachmentDescriptor>;
}

/**
 * Contract §2. The one payload that crosses the one boundary. There is **no**
 * `surveyVersion` field (research D18, plan §10 item 3).
 */
export interface SurveyResponse {
  readonly surveyKey: SurveyKey;
  readonly clientSubmissionId: ClientSubmissionId;
  /** ISO 8601 UTC, refreshed on every attempt including a retry. */
  readonly submittedAt: string;
  /** Survey page order, then question order within a page. */
  readonly answers: readonly AnswerEntry[];
}

/** Contract §3. The only thing that may produce the `submitted` state. */
export interface SubmissionReceipt {
  readonly submissionId: string;
  readonly receivedAt: string;
}

/** Contract §4. */
export type SubmissionFailureKind =
  | 'transport-error'
  | 'timeout'
  | 'rejected'
  | 'not-found'
  | 'unauthorized'
  | 'server-error'
  | 'malformed-response';

export interface SubmissionFailureDetail {
  readonly questionId: QuestionId;
  readonly reason: string;
}

export interface SubmissionFailure {
  readonly kind: SubmissionFailureKind;
  /** Respondent-facing text, fixed per `kind` by contract §4. */
  readonly message: string;
  /** Empty unless `kind` is `rejected`. */
  readonly details: readonly SubmissionFailureDetail[];
}

/** A gateway returns this. It never throws and never rejects. */
export type SubmissionResult =
  | { readonly outcome: 'acknowledged'; readonly receipt: SubmissionReceipt }
  | { readonly outcome: 'failed'; readonly failure: SubmissionFailure };
