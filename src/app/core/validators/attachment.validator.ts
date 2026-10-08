/**
 * Attachment selection rules — T026, implementing FR-023's five checks **in order**.
 *
 * The order matters and is the contract's, not a convenience: the first failing check
 * determines the message (FR-023).
 *
 * 1. accepted type — taken **only** from this question's `acceptedTypes`, never from a
 *    viewer-wide list (FR-028);
 * 2. size within `maxSizeBytes`;
 * 3. non-zero size;
 * 4. not already attached, by name **and** size, against what is already held;
 * 5. a free slot within `maxFiles`.
 *
 * Files are taken in selection order until `maxFiles` is reached; each remaining file is
 * rejected with the count message. A mixed selection still attaches its valid files
 * (FR-024), and zero files always passes — attachments are never required (FR-022).
 *
 * **Deviation from `data-model.md` §6, flagged for the Solution Architect.** §6 types
 * `AttachmentSelectionResult.accepted` as `readonly SessionAttachment[]`, but a
 * `SessionAttachment` carries an `AttachmentId` from `IdFactoryService` and bytes from
 * `AttachmentCodecService`, both of which are effectful — and T026 requires this function
 * to be pure. `accepted` therefore holds `AttachmentCandidate`, and
 * `SurveySessionService.addFiles` is what mints the id and reads the bytes immediately
 * afterwards (research D6, D17). The two readings cannot both hold; this is the only one
 * that keeps the validator pure.
 */

import type {
  AttachmentCandidate,
  AttachmentRejection,
  AttachmentRejectionReason,
  AttachmentSelectionResult,
  SessionAttachment,
} from '../models/answer.model';
import type { QuestionId } from '../models/branded';
import type { AcceptedFileType, AttachmentPolicy } from '../models/survey.model';
import { attachmentRejectionMessage } from './messages';

/**
 * Contract §3: a file is of an accepted type when its reported MIME type is listed, or its
 * lowercased file extension is listed. Nothing else makes a type acceptable — in
 * particular not the operating system having offered the file (FR-028).
 */
export function isAcceptedType(
  file: Pick<AttachmentCandidate, 'name' | 'mimeType'>,
  acceptedTypes: readonly AcceptedFileType[],
): boolean {
  const mimeType = file.mimeType.toLowerCase();
  const dot = file.name.lastIndexOf('.');
  const extension = dot === -1 ? null : file.name.slice(dot).toLowerCase();
  return acceptedTypes.some((accepted) => accepted === mimeType || accepted === extension);
}

function reject(
  questionId: QuestionId,
  file: AttachmentCandidate,
  reason: AttachmentRejectionReason,
  policy: AttachmentPolicy,
): AttachmentRejection {
  return {
    questionId,
    fileName: file.name,
    reason,
    message: attachmentRejectionMessage(reason, file.name, policy),
  };
}

/**
 * The first FR-023 check a file fails, or `null` when it passes all five.
 *
 * `held` is everything already attached **plus** everything accepted earlier in this same
 * selection, which is what makes the duplicate and free-slot checks see the selection as
 * the respondent does.
 */
function firstFailure(
  file: AttachmentCandidate,
  policy: AttachmentPolicy,
  held: readonly AttachmentCandidate[],
): AttachmentRejectionReason | null {
  if (!isAcceptedType(file, policy.acceptedTypes)) {
    return 'unaccepted-type';
  }
  if (file.sizeBytes > policy.maxSizeBytes) {
    return 'too-large';
  }
  if (file.sizeBytes === 0) {
    return 'empty';
  }
  if (held.some((other) => other.name === file.name && other.sizeBytes === file.sizeBytes)) {
    return 'duplicate';
  }
  if (held.length >= policy.maxFiles) {
    return 'no-free-slot';
  }
  return null;
}

/**
 * Runs FR-023's five checks over one multi-file selection.
 *
 * `existing` is what the question already holds. Zero candidates always yields an empty
 * result: attachments are never required (FR-022).
 */
export function validateAttachmentSelection(
  questionId: QuestionId,
  policy: AttachmentPolicy,
  existing: readonly SessionAttachment[],
  candidates: readonly AttachmentCandidate[],
): AttachmentSelectionResult {
  const accepted: AttachmentCandidate[] = [];
  const rejected: AttachmentRejection[] = [];
  const held: AttachmentCandidate[] = existing.map((attachment) => ({
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  }));

  for (const candidate of candidates) {
    const failure = firstFailure(candidate, policy, held);
    if (failure === null) {
      accepted.push(candidate);
      held.push(candidate);
      continue;
    }
    rejected.push(reject(questionId, candidate, failure, policy));
  }

  return { accepted, rejected };
}

/**
 * The FR-027 re-check: one already-held attachment against its question's **current**
 * policy. Returns the reason it no longer satisfies the policy, or `null`.
 *
 * The count half is the caller's, because it is a property of the set rather than of one
 * file; `validateSurvey` applies it.
 */
export function attachmentErrorsFor(
  question: Pick<SurveyOption, 'id'>,
  existing: readonly SessionAttachment[],
): AttachmentRejection | null {
  for (const attachment of existing) {
    if (!isAcceptedType(attachment, question.acceptedTypes)) {
      return {
        questionId: question.id,
        name: attachment.name,
        reason: 'unaccepted-type' as const,
      };
    }
    if (attachment.sizeBytes > question.maxSizeBytes) {
      return {
        questionId: question.id,
        name: attachment.name,
        reason: 'too-large' as const,
      };
    }
    if (attachment.sizeBytes === 0) {
      return {
        questionId: question.id,
        name: attachment.name,
        reason: 'empty' as const,
      };
    }
  }
  return null;
}
