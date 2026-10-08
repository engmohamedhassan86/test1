import { SurveyResponse } from '../models/survey-response.model';
import { SubmissionReceipt } from './submission-receipt.validator';

export abstract class SurveyResponseGateway {
  abstract submit(response: SurveyResponse, signal: AbortSignal): Promise<SubmissionResult>;
}

export type SubmissionResult =
  | { readonly outcome: 'acknowledged'; readonly receipt: SubmissionReceipt }
  | { readonly outcome: 'failed'; readonly failure: SubmissionFailure };

export interface SubmissionFailure {
  readonly kind: SubmissionFailureKind;
  readonly message: string;
  readonly details?: readonly SubmissionFailureDetail[];
}

export interface SubmissionFailureDetail {
  readonly questionId: QuestionId;
  readonly reason: string;
}

export type SubmissionFailureKind =
  | 'transport-error'
  | 'timeout'
  | 'rejected'
  | 'not-found'
  | 'unauthorized'
  | 'server-error'
  | 'malformed-response';
