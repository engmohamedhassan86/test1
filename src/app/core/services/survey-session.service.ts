/**
 * The one source of truth — T067 to T071, `plan.md` §4.3.
 *
 * Why one service and not several: every rule in this feature that is easy to get wrong is
 * a rule about two pieces of state at once — answers and errors (FR-020), answers and
 * state (FR-045), attachments and validation (FR-027), the current page and the validation
 * scope (FR-034). Splitting them would put those invariants *between* two services, which
 * is where they break.
 *
 * Three structural decisions carry most of the fail-closed behaviour:
 *
 * - **Answers and attachments live outside the `ResponseState` variant.** A state change
 *   therefore cannot drop them, which is what makes "a failed submission preserves the
 *   answers" (FR-045, SC-007) a property of the shape rather than of a code path.
 * - **Every state write goes through one `transitionTo()`** that asserts
 *   `canTransition(from, to)` and throws. `plan.md` §3's table is the enforcement, not a
 *   comment. A second Submit while `submitting` is refused by the table — `submitting` has
 *   no self-edge — and not by a boolean flag (FR-039).
 * - **`setAnswer` normalises on the way in** (`data-model.md` §6.1). `"  "` never becomes
 *   an answer, so FR-014's "a required empty answer reports the required rule, not the
 *   `minLength` rule" needs no rule-ordering code anywhere.
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import { assertNever } from '../models/assert-never';
import type {
  Answer,
  AnswerInput,
  AnswerMap,
  AttachmentCandidate,
  AttachmentMap,
  AttachmentRejection,
  SessionAttachment,
} from '../models/answer.model';
import type { AttachmentId, ClientSubmissionId, OptionValue, QuestionId } from '../models/branded';
import type { FocusRequest } from '../models/focus-request';
import type { ResponseState } from '../models/response-state.model';
import { canTransition } from '../models/response-state.model';
import type { SurveyConfigError } from '../models/survey-config-error.model';
import type { SubmissionResult, SurveyResponse } from '../models/survey-response.model';
import type {
  CheckboxQuestion,
  Question,
  SatisfactionPoint,
  Survey,
  SurveyPage,
  TextQuestion,
} from '../models/survey.model';
import type { ValidationError } from '../models/validation.model';
import {
  attachmentAddedAnnouncement,
  attachmentRemovedAnnouncement,
  multiplePagesInvalidMessage,
  submissionFailureMessage,
  submittingAnnouncement,
  validationBlockedAnnouncement,
} from '../validators/messages';
import { validateAttachmentSelection } from '../validators/attachment.validator';
import { validatePage } from '../validators/page.validator';
import { validateSurvey } from '../validators/survey.validator';
import { AnnouncerService } from './announcer.service';
import { AttachmentCodecService } from './attachment-codec.service';
import { IdFactoryService } from './id-factory.service';
import { SurveyResponseGateway } from './survey-response.gateway';
import { buildSurveyResponse } from './survey-response-payload';
import type { EncodedAttachments } from './survey-response-payload';
import { SURVEY_TIMEOUTS } from './survey-timeouts';

@Injectable({ providedIn: 'root' })
export class SurveySessionService {
  private readonly announcer = inject(AnnouncerService);
  private readonly codec = inject(AttachmentCodecService);
  private readonly ids = inject(IdFactoryService);
  private readonly gateway = inject(SurveyResponseGateway);
  private readonly timeouts = inject(SURVEY_TIMEOUTS);

  // ---- state (writable only from inside) --------------------------------------------

  private readonly responseState = signal<ResponseState>({ kind: 'loading', surveyKey: '' });
  private readonly pageIndex = signal(0);
  private readonly answerMap = signal<AnswerMap>(new Map());
  private readonly attachmentMap = signal<AttachmentMap>(new Map());
  private readonly errorMap = signal<ReadonlyMap<QuestionId, ValidationError>>(new Map());
  private readonly rejections = signal<readonly AttachmentRejection[]>([]);
  private readonly dirtyFlag = signal(false);
  private readonly focus = signal<FocusRequest | null>(null);

  readonly state = this.responseState.asReadonly();
  readonly currentPageIndex = this.pageIndex.asReadonly();
  readonly answers = this.answerMap.asReadonly();
  readonly attachments = this.attachmentMap.asReadonly();
  readonly questionErrors = this.errorMap.asReadonly();
  readonly attachmentRejections = this.rejections.asReadonly();
  readonly dirty = this.dirtyFlag.asReadonly();
  readonly focusRequest = this.focus.asReadonly();

  /**
   * Minted on first entry to `submitting` and re-used by every retry of this session
   * (FR-061). Not a signal: no screen renders it, and contract test 10 asserts it through
   * the payload rather than through the view.
   */
  private submissionId: ClientSubmissionId | null = null;

  /** Monotonic, so a repeated focus request for the same question is a new value. */
  private focusToken = 0;

  // ---- derived ----------------------------------------------------------------------

  readonly survey = computed<Survey | null>(() => surveyOf(this.responseState()));

  readonly pageCount = computed(() => this.survey()?.pages.length ?? 0);

  readonly currentPage = computed<SurveyPage | null>(
    () => this.survey()?.pages[this.pageIndex()] ?? null,
  );

  /** FR-032. One-based for the respondent; `Page 0 of 0` is unreachable while rendering. */
  readonly positionLabel = computed(() => `Page ${this.pageIndex() + 1} of ${this.pageCount()}`);

  /** FR-031: Previous is unavailable on the first page. */
  readonly isFirstPage = computed(() => this.pageIndex() === 0);

  /** FR-033: the last page's primary action is Submit, every other page's is Next. */
  readonly primaryAction = computed<'next' | 'submit'>(() =>
    this.pageIndex() >= this.pageCount() - 1 ? 'submit' : 'next',
  );

  /** FR-039: inputs are non-editable only while a submission is in flight. */
  readonly inputsLocked = computed(() => this.responseState().kind === 'submitting');

  /** The errors for the page being shown, in page order. */
  readonly currentPageErrors = computed<readonly ValidationError[]>(() => {
    const state = this.responseState();
    return state.kind === 'validation-error' ? state.page.errors : [];
  });

  /** FR-034: the summary names more than one page only when more than one is invalid. */
  readonly multiplePagesInvalid = computed(() => {
    const state = this.responseState();
    return (
      state.kind === 'validation-error' &&
      state.surveyReport !== null &&
      state.surveyReport.invalidPageIndexes.length > 1
    );
  });

  /** FR-015: the control's own ceiling, so the browser stops the 256th character. */
  maxLengthOf(question: TextQuestion): number {
    return question.maxLength;
  }

  /**
   * FR-017: once `maxSelections` is reached, an option that is not already selected cannot
   * be selected. Returns a signal, so the caller holds it for the lifetime of a control
   * rather than calling this from a template — a call per change-detection pass would
   * create a new `computed` each time.
   */
  isOptionSelectable(question: CheckboxQuestion, value: OptionValue): Signal<boolean> {
    return computed(() => {
      const answer = this.answerMap().get(question.id);
      const selected: readonly OptionValue[] =
        answer !== undefined && answer.type === 'checkbox' ? answer.value : [];
      return selected.includes(value) || selected.length < question.maxSelections;
    });
  }

  /** The error standing against one question, or `undefined`. FR-054's association. */
  errorFor(questionId: QuestionId): ValidationError | undefined {
    return this.errorMap().get(questionId);
  }

  /** What one question currently holds. Empty is the common case. */
  attachmentsFor(questionId: QuestionId): readonly SessionAttachment[] {
    return this.attachmentMap().get(questionId) ?? [];
  }

  // ---- commands --------------------------------------------------------------------

  /**
   * `loading -> ready`, page index 0, every signal reset. Mints no `clientSubmissionId`.
   *
   * The reset includes the state signal, which is why reopening a survey that reached the
   * terminal `submitted` state works: `open` *resets* the machine rather than transitioning
   * out of a terminal state, and a reset is not a transition. The `loading -> ready` edge
   * is then the normal one.
   */
  open(survey: Survey): void {
    this.reset(survey.key);
    this.transitionTo({ kind: 'ready', survey });
  }

  /** `loading -> configuration-error`. Terminal: the only way out is a route change. */
  openFailed(error: SurveyConfigError): void {
    this.reset(error.subject);
    this.transitionTo({ kind: 'configuration-error', error });
  }

  /**
   * Normalises per `data-model.md` §6.1, clears that question's error immediately
   * (FR-020), sets `dirty`, and moves `ready`/`submission-error` to `editing`.
   */
  setAnswer(question: Question, input: AnswerInput): void {
    const normalised = normalise(question, input);
    if (normalised === null) {
      this.clearAnswer(question.id);
      return;
    }

    const next = new Map(this.answerMap());
    next.set(question.id, normalised);
    this.answerMap.set(next);
    this.afterAnswerChange(question.id);
  }

  /** FR-060: allowed on a required question — clearing is not the same as never answering. */
  clearAnswer(questionId: QuestionId): void {
    const next = new Map(this.answerMap());
    next.delete(questionId);
    this.answerMap.set(next);
    this.afterAnswerChange(questionId);
  }

  /**
   * FR-023, FR-024, FR-026: the selection is checked **in order**, files are accepted until
   * `maxFiles` is reached, and the bytes of each accepted file are read immediately
   * (research D6). A read that fails after the five checks passed is demoted to an
   * `unreadable` rejection (research D17) rather than thrown — valid files in a mixed
   * selection still attach.
   */
  async addFiles(question: Question, files: readonly File[]): Promise<void> {
    const policy = question.attachments;
    if (policy === null || files.length === 0) {
      // A question with no policy accepts nothing; FR-022 makes zero files always valid.
      return;
    }

    const existing = this.attachmentsFor(question.id);
    const candidates: readonly AttachmentCandidate[] = files.map(candidateOf);
    const outcome = validateAttachmentSelection(question.id, policy, existing, candidates);

    const accepted: SessionAttachment[] = [];
    const rejected: AttachmentRejection[] = [...outcome.rejected];

    for (const candidate of outcome.accepted) {
      // `candidates[i]` was built from `files[i]`, and `outcome.accepted` holds those same
      // candidate objects, so the index is the file.
      const file = files[candidates.indexOf(candidate)];
      const bytes = await this.codec.read(file);
      if (bytes === 'unreadable') {
        rejected.push({
          questionId: question.id,
          fileName: candidate.name,
          reason: 'unreadable',
          message: `${candidate.name}: this file could not be read`,
        });
        continue;
      }
      accepted.push({
        id: this.ids.newAttachmentId(),
        name: candidate.name,
        mimeType: candidate.mimeType,
        sizeBytes: candidate.sizeBytes,
        bytes,
      });
    }

    if (accepted.length > 0) {
      const next = new Map(this.attachmentMap());
      next.set(question.id, [...existing, ...accepted]);
      this.attachmentMap.set(next);
      this.dirtyFlag.set(true);
      this.clearErrorFor(question.id);
      this.announcer.announcePolite(
        accepted.map((attachment) => attachmentAddedAnnouncement(attachment.name)).join(', '),
      );
      this.leaveReadyOrSubmissionError();
    }

    // FR-024: one rejection per rejected file, each naming the file and the reason.
    this.rejections.set(rejected);
    if (rejected.length > 0 && accepted.length === 0) {
      this.announcer.announcePolite(rejected.map((rejection) => rejection.message).join(' '));
    }
  }

  /** FR-026: the slot is freed immediately and the removal announced politely. */
  removeAttachment(questionId: QuestionId, attachmentId: AttachmentId): void {
    const existing = this.attachmentsFor(questionId);
    const removed = existing.find((attachment) => attachment.id === attachmentId);
    if (removed === undefined) {
      return;
    }

    const remaining = existing.filter((attachment) => attachment.id !== attachmentId);
    const next = new Map(this.attachmentMap());
    if (remaining.length === 0) {
      next.delete(questionId);
    } else {
      next.set(questionId, remaining);
    }
    this.attachmentMap.set(next);
    this.dirtyFlag.set(true);
    this.clearErrorFor(questionId);
    this.rejections.set([]);
    this.announcer.announcePolite(attachmentRemovedAnnouncement(removed.name));
    this.leaveReadyOrSubmissionError();
  }

  /**
   * FR-029: validates **the current page only**. Valid moves forward and focuses the new
   * page's heading; invalid leaves the page index alone, goes to `validation-error` with
   * `scope: 'page'`, focuses `firstInvalidQuestionId` and announces assertively (FR-030).
   */
  next(): void {
    const survey = this.survey();
    const page = this.currentPage();
    if (survey === null || page === null || this.inputsLocked()) {
      return;
    }

    const report = validatePage(page, this.pageIndex(), this.answerMap(), this.attachmentMap());

    if (report.errors.length > 0) {
      this.errorMap.set(errorsByQuestion(report.errors));
      this.transitionTo({
        kind: 'validation-error',
        survey,
        scope: 'page',
        page: report,
        surveyReport: null,
      });
      this.requestFocus(report.firstInvalidQuestionId);
      this.announcer.announceAssertive(validationBlockedAnnouncement(report.errors.length));
      return;
    }

    if (this.pageIndex() >= this.pageCount() - 1) {
      // FR-033: the last page has no Next. Reaching here would be a component bug.
      return;
    }

    this.errorMap.set(new Map());
    this.pageIndex.update((index) => index + 1);
    this.clearValidationState(survey);
    this.requestFocus(null);
  }

  /**
   * FR-031: validates nothing and is never blocked. FR-064: the errors raised on the page
   * being left are discarded, so it returns in `editing` with its answers intact.
   */
  previous(): void {
    const survey = this.survey();
    if (survey === null || this.isFirstPage() || this.inputsLocked()) {
      return;
    }

    this.errorMap.set(new Map());
    this.rejections.set([]);
    this.pageIndex.update((index) => index - 1);
    this.clearValidationState(survey);
    this.requestFocus(null);
  }

  /**
   * FR-034: validates **every page in order**, including the FR-027 attachment re-check.
   * Any page invalid goes to `validation-error` with `scope: 'survey'`, moves to
   * `earliestInvalidPageIndex`, mints **no** `clientSubmissionId` and makes **no** gateway
   * call (FR-061, contract tests 9 and 13).
   */
  submit(): Promise<void> {
    return this.runSubmission();
  }

  /**
   * FR-061: identical to `submit` except that the existing `clientSubmissionId` is re-used
   * with a fresh `submittedAt` (contract test 10). The re-use is unconditional in
   * `runSubmission`, so the two differ only in the state they are reachable from — which
   * the transition table, not a parameter, decides.
   */
  retry(): Promise<void> {
    return this.runSubmission();
  }

  // ---- internals -------------------------------------------------------------------

  private async runSubmission(): Promise<void> {
    const survey = this.survey();
    if (survey === null) {
      return;
    }

    // FR-039: `submitting` has no self-edge, so a second Submit is refused by the table.
    const from = this.responseState().kind;
    if (!canTransition(from, 'submitting') && !canTransition(from, 'editing')) {
      return;
    }

    const report = validateSurvey(survey, this.answerMap(), this.attachmentMap());
    if (report.earliestInvalidPageIndex !== null) {
      const target = report.earliestInvalidPageIndex;
      const pageReport = report.pages[target];
      this.pageIndex.set(target);
      this.errorMap.set(errorsByQuestion(pageReport.errors));
      this.transitionTo({
        kind: 'validation-error',
        survey,
        scope: 'survey',
        page: pageReport,
        surveyReport: report,
      });
      this.requestFocus(pageReport.firstInvalidQuestionId);
      this.announcer.announceAssertive(
        report.invalidPageIndexes.length > 1
          ? multiplePagesInvalidMessage()
          : validationBlockedAnnouncement(pageReport.errors.length),
      );
      return;
    }

    // `ready -> submitting` is not an edge in `plan.md` §3's table, and an all-optional
    // survey submitted without a single answer arrives here in `ready`. The two legal
    // edges `ready -> editing -> submitting` cover it without changing the table.
    // **Flagged for the Solution Architect**: §3 does not name this case.
    if (!canTransition(this.responseState().kind, 'submitting')) {
      this.transitionTo({ kind: 'editing', survey });
    }

    this.submissionId ??= this.ids.newClientSubmissionId();
    this.errorMap.set(new Map());
    this.transitionTo({ kind: 'submitting', survey });
    this.announcer.announcePolite(submittingAnnouncement());

    const encoded = this.encodeHeldAttachments();
    const payload = buildSurveyResponse(survey, this.answerMap(), this.attachmentMap(), encoded, {
      clientSubmissionId: this.submissionId,
      submittedAt: new Date().toISOString(),
    });

    const result = await this.callGateway(payload);

    if (result.outcome === 'acknowledged') {
      this.transitionTo({ kind: 'submitted', survey, receipt: result.receipt });
      // FR-045: the session's answers are discarded once the response is acknowledged.
      this.answerMap.set(new Map());
      this.attachmentMap.set(new Map());
      this.rejections.set([]);
      this.dirtyFlag.set(false);
      return;
    }

    // SC-007: answers and attachments are untouched on every failure kind.
    this.transitionTo({ kind: 'submission-error', survey, failure: result.failure });
    this.announcer.announceAssertive(result.failure.message);
  }

  /**
   * Contract §9: the **caller** owns the 15s clock, so FR-038 applies identically to all
   * three adapters and contract test 7 is one test rather than one per adapter. An
   * `AbortController` plus a `setTimeout` rather than `AbortSignal.timeout()`, which
   * Vitest's fake timers do not patch (research D10).
   */
  private async callGateway(payload: SurveyResponse): Promise<SubmissionResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeouts.submitMs);

    const deadline = new Promise<SubmissionResult>((resolve) => {
      controller.signal.addEventListener(
        'abort',
        () =>
          resolve({
            outcome: 'failed',
            failure: {
              kind: 'timeout',
              message: submissionFailureMessage('timeout'),
              details: [],
            },
          }),
        { once: true },
      );
    });

    try {
      return await Promise.race([this.gateway.submit(payload, controller.signal), deadline]);
    } finally {
      clearTimeout(timer);
      // Stops a request still in flight, so a late acknowledgement cannot race a retry.
      controller.abort();
    }
  }

  private encodeHeldAttachments(): EncodedAttachments {
    const encoded = new Map<AttachmentId, string>();
    for (const held of this.attachmentMap().values()) {
      for (const attachment of held) {
        encoded.set(attachment.id, this.codec.toBase64(attachment.bytes));
      }
    }
    return encoded;
  }

  /** The one state write. `plan.md` §3's table is the enforcement, not a comment. */
  private transitionTo(next: ResponseState): void {
    const from = this.responseState().kind;
    if (!canTransition(from, next.kind)) {
      throw new Error(`Illegal response-state transition: ${from} -> ${next.kind}`);
    }
    this.responseState.set(next);
  }

  private reset(surveyKey: string): void {
    this.responseState.set({ kind: 'loading', surveyKey });
    this.pageIndex.set(0);
    this.answerMap.set(new Map());
    this.attachmentMap.set(new Map());
    this.errorMap.set(new Map());
    this.rejections.set([]);
    this.dirtyFlag.set(false);
    this.focus.set(null);
    this.submissionId = null;
    this.focusToken = 0;
  }

  private afterAnswerChange(questionId: QuestionId): void {
    this.dirtyFlag.set(true);
    this.clearErrorFor(questionId);
    this.leaveReadyOrSubmissionError();
  }

  /** FR-020: the error goes the moment the answer changes, with no re-validation. */
  private clearErrorFor(questionId: QuestionId): void {
    if (!this.errorMap().has(questionId)) {
      return;
    }
    const next = new Map(this.errorMap());
    next.delete(questionId);
    this.errorMap.set(next);
  }

  /**
   * Contract §6: an edit moves `ready` and `submission-error` to `editing`. A
   * `validation-error` stays until the last error on the page has been cleared, which is
   * US2 scenario 8 — one answer fixed removes one message, not the whole summary.
   */
  private leaveReadyOrSubmissionError(): void {
    const state = this.responseState();
    if (state.kind === 'ready' || state.kind === 'submission-error') {
      this.transitionTo({ kind: 'editing', survey: state.survey });
      return;
    }
    if (state.kind === 'validation-error' && this.errorMap().size === 0) {
      this.transitionTo({ kind: 'editing', survey: state.survey });
    }
  }

  /** Navigation alone never changes the kind, so only `validation-error` is left here. */
  private clearValidationState(survey: Survey): void {
    if (this.responseState().kind === 'validation-error') {
      this.transitionTo({ kind: 'editing', survey });
    }
  }

  private requestFocus(questionId: QuestionId | null): void {
    this.focusToken += 1;
    this.focus.set({ questionId, token: this.focusToken });
  }
}

// --- pure helpers -------------------------------------------------------------------

function surveyOf(state: ResponseState): Survey | null {
  switch (state.kind) {
    case 'loading':
    case 'configuration-error':
      return null;
    case 'ready':
    case 'editing':
    case 'validation-error':
    case 'submitting':
    case 'submitted':
    case 'submission-error':
      return state.survey;
  }
  return assertNever(state);
}

function errorsByQuestion(
  errors: readonly ValidationError[],
): ReadonlyMap<QuestionId, ValidationError> {
  const map = new Map<QuestionId, ValidationError>();
  for (const error of errors) {
    // At most one error per question (plan §4.3), so the first one wins.
    if (!map.has(error.questionId)) {
      map.set(error.questionId, error);
    }
  }
  return map;
}

function candidateOf(file: File): AttachmentCandidate {
  return { name: file.name, mimeType: file.type, sizeBytes: file.size };
}

/**
 * `data-model.md` §6.1, the whole of it. `null` means "store nothing", which is how
 * unanswered stays *absence* from the map rather than an empty value in it (D4).
 */
function normalise(question: Question, input: AnswerInput): Answer | null {
  switch (question.type) {
    case 'textbox':
    case 'textarea': {
      if (input.kind !== 'text') {
        return null;
      }
      const trimmed = input.value.trim();
      return trimmed === '' ? null : { type: question.type, value: trimmed };
    }

    case 'radio':
      return input.kind === 'option' ? { type: 'radio', value: input.value } : null;

    case 'checkbox': {
      if (input.kind !== 'options') {
        return null;
      }
      // Ordered by the question's option order, not selection order, and de-duplicated.
      const ordered = question.options
        .map((option) => option.value)
        .filter((value) => input.values.includes(value));
      return ordered.length === 0
        ? null
        : { type: 'checkbox', value: [ordered[0], ...ordered.slice(1)] };
    }

    case 'rating':
      return input.kind === 'point' ? { type: 'rating', value: input.value } : null;

    case 'satisfaction':
      // The five points are the only representable values, so a number outside them is
      // not stored at all; the control offers nothing else, and the required rule reports
      // on the absence. That is why `scale-range` is reachable only for `rating`.
      return input.kind === 'point' && isSatisfactionPoint(input.value)
        ? { type: 'satisfaction', value: input.value }
        : null;
  }
  return assertNever(question);
}

function isSatisfactionPoint(value: number): value is SatisfactionPoint {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}
