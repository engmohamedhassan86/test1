/**
 * The attachment control — T117, FR-021, FR-025, FR-065, FR-071.
 *
 * Rendered by `question-host` for **any** of the six types, because `contracts/survey-config.md`
 * §2 allows an `attachments` block on any of them. It renders nothing at all when
 * `question.attachments` is `null`, which the config validator has already made the single
 * representation of both "no block" and `maxFiles: 0` — so FR-021 and US3 scenario 10 are
 * one branch here rather than two.
 *
 * ## FR-065: the list is rendered from the session, never from the input
 *
 * `<input type="file">` holds a `FileList` the page cannot repopulate — assigning to
 * `.value` is restricted to clearing it, by design. So a list rendered from the input would
 * come back empty the moment the respondent left page 3 and returned, even though the bytes
 * were still held. The list, the counter and the Remove controls therefore all read
 * `session.attachments()`, and the input is cleared after every selection so that
 * re-choosing the same file is a fresh `change` event rather than a no-op.
 *
 * ## What this component does not decide
 *
 * - **Acceptance.** Every selection goes to `session.addFiles`, which runs FR-023's ordered
 *   checks in `core`. This component never looks at a file's type, size or name. A control
 *   that pre-filtered would be a second, divergent copy of the rules — and the `accept`
 *   attribute below is a *hint to the file picker*, not a check: it is trivially bypassed
 *   by choosing "All files", which is exactly why `core` re-checks.
 * - **Message text.** The counter is `attachmentCounterMessage`, each rejection is the
 *   `message` the validator already composed, and each size is `formatFileSize`. No
 *   respondent-facing sentence is assembled here or in the template.
 * - **Re-checking at submit.** FR-027's re-check is `validateSurvey`'s, reached through
 *   `session.submit()`.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import type { AttachmentId } from '../../../core/models/branded';
import { formatAcceptedTypes, formatFileSize } from '../../../core/models/display-format';
import type { Question } from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';
import { attachmentCounterMessage } from '../../../core/validators/messages';

/** One row of the held-files list. */
interface AttachmentRow {
  readonly id: AttachmentId;
  readonly name: string;
  /** FR-071's human size, e.g. `1 MB`. */
  readonly size: string;
}

@Component({
  selector: 'app-question-attachments',
  templateUrl: './question-attachments.html',
  styleUrl: './question-attachments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionAttachmentsComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<Question>();

  /** The question's title id, so the file control's label can name its own question. */
  readonly titleId = input.required<string>();

  /** `null` when the question has no attachment block — the whole control then renders nothing. */
  protected readonly policy = computed(() => this.question().attachments);

  protected readonly held = computed<readonly AttachmentRow[]>(() =>
    this.session.attachmentsFor(this.question().id).map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      size: formatFileSize(attachment.sizeBytes),
    })),
  );

  /** FR-025's `N of 3 files`, composed in `core`. */
  protected readonly counter = computed(() => {
    const policy = this.policy();
    return policy === null ? '' : attachmentCounterMessage(this.held().length, policy.maxFiles);
  });

  /**
   * FR-022: at `maxFiles` the control closes, and removing a file re-opens it.
   *
   * Closed as `disabled` rather than removed from the DOM: a control that vanishes moves
   * every later tab stop and gives a keyboard user no explanation, where a disabled one
   * stays in place beside a counter that reads `3 of 3 files`. `core` also rejects an
   * over-limit selection with `no-free-slot`, so this is the affordance and not the rule.
   */
  protected readonly full = computed(() => {
    const policy = this.policy();
    return policy !== null && this.held().length >= policy.maxFiles;
  });

  protected readonly locked = this.session.inputsLocked;

  /**
   * The `accept` hint for the file picker, from the same policy `core` validates against.
   *
   * A hint only — the picker's "All files" escape hatch means this filters nothing. It is
   * here because it makes the common case pleasant, not because anything depends on it.
   */
  protected readonly acceptHint = computed(() => {
    const policy = this.policy();
    return policy === null ? '' : policy.acceptedTypes.join(',');
  });

  /** FR-072's `PNG, JPEG, PDF`, shown so the rules are legible before a rejection. */
  protected readonly acceptedLabel = computed(() => {
    const policy = this.policy();
    return policy === null ? '' : formatAcceptedTypes(policy.acceptedTypes);
  });

  protected readonly maxSizeLabel = computed(() => {
    const policy = this.policy();
    return policy === null ? '' : formatFileSize(policy.maxSizeBytes);
  });

  /**
   * FR-024: this question's rejections, one per rejected file.
   *
   * Filtered by question id because the session holds one flat list: a rejection on
   * `q_evidence` must not appear under a different question that happens to be on the same
   * page.
   */
  protected readonly rejections = computed(() =>
    this.session
      .attachmentRejections()
      .filter((rejection) => rejection.questionId === this.question().id),
  );

  protected readonly inputId = computed(() => `sv-q-${this.question().id}-files`);
  protected readonly hintId = computed(() => `sv-q-${this.question().id}-files-hint`);
  protected readonly labelId = computed(() => `sv-q-${this.question().id}-files-label`);

  /**
   * FR-053's `aria-labelledby` for the file input: the question's title, then this
   * control's own label.
   *
   * The title first, so the name reads "Anything we should see? Attach a file" rather than
   * the other way round. Without the title, four attachment controls on one page would all
   * be named "Attach a file" and a screen reader's control list would be useless.
   */
  protected readonly nameIds = computed(() => `${this.titleId()} ${this.labelId()}`);

  /**
   * Forwards the selection and clears the input.
   *
   * The clear matters for two separate reasons: it keeps the rendered list unambiguously
   * the session's (FR-065), and it makes re-choosing a file that was just rejected fire a
   * new `change` event, which a browser suppresses when the `FileList` is unchanged.
   */
  protected async choose(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.files === null) {
      return;
    }
    const files = [...input.files];
    input.value = '';
    await this.session.addFiles(this.question(), files);
  }

  protected remove(attachmentId: AttachmentId): void {
    this.session.removeAttachment(this.question().id, attachmentId);
  }
}
