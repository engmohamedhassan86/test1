/**
 * The one place a question type is dispatched — T091, FR-003, FR-005.
 *
 * It renders, **once for all six types**, the question's title, its optional `description`
 * when present, and a visible indication of whether an answer is required. Putting those
 * three here rather than in each type component means no type can omit them — which is
 * also why one regression here regresses FR-005 for every type, and why T111 asserts both
 * halves of the required indication (a required question shows it, an optional one does
 * not).
 *
 * The dispatch is exhaustive by construction: `viewOf` switches on the discriminant with
 * **no `default` branch** and ends in `assertNever`, so adding a seventh question type is a
 * build failure here (`plan.md` §5.3).
 *
 * ## The two FR-053 label forms
 *
 * The host owns the title element and its id, and each type component is handed that id:
 *
 * - **grouped** (`radio`, `checkbox`, `rating`, `satisfaction`) — the group carries
 *   `aria-labelledby` pointing at the title, so the group's accessible name *is* the
 *   question's title text;
 * - **single control** (`textbox`, `textarea`) — the input carries the same
 *   `aria-labelledby` and is **not** wrapped in a group.
 *
 * The required indication is `aria-hidden` and `aria-required` carries it programmatically
 * instead, so the accessible name stays exactly the title — which is what T105 to T107
 * assert.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { assertNever } from '../../../core/models/assert-never';
import type {
  CheckboxQuestion,
  Question,
  RadioQuestion,
  RatingQuestion,
  SatisfactionQuestion,
  TextQuestion,
} from '../../../core/models/survey.model';
import { SurveySessionService } from '../../../core/services/survey-session.service';
import { CheckboxQuestionComponent } from './checkbox-question';
import { RadioQuestionComponent } from './radio-question';
import { RatingQuestionComponent } from './rating-question';
import { SatisfactionQuestionComponent } from './satisfaction-question';
import { TextQuestionComponent } from './text-question';

/**
 * The DOM id of one question's wrapper. Shared with `survey-page.ts`, which uses it to
 * satisfy FR-030 — so the convention lives in one place rather than in two string
 * templates that could drift.
 */
export function questionWrapperId(questionId: string): string {
  return `sv-q-${questionId}`;
}

/** The dispatch target for one question, with its member narrowed. */
type QuestionView =
  | { readonly kind: 'radio'; readonly question: RadioQuestion }
  | { readonly kind: 'checkbox'; readonly question: CheckboxQuestion }
  | { readonly kind: 'text'; readonly question: TextQuestion }
  | { readonly kind: 'rating'; readonly question: RatingQuestion }
  | { readonly kind: 'satisfaction'; readonly question: SatisfactionQuestion };

@Component({
  selector: 'app-question-host',
  imports: [
    RadioQuestionComponent,
    CheckboxQuestionComponent,
    TextQuestionComponent,
    RatingQuestionComponent,
    SatisfactionQuestionComponent,
  ],
  templateUrl: './question-host.html',
  styleUrl: './question-host.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionHostComponent {
  private readonly session = inject(SurveySessionService);

  readonly question = input.required<Question>();

  protected readonly view = computed(() => viewOf(this.question()));

  protected readonly wrapperId = computed(() => questionWrapperId(this.question().id));
  protected readonly titleId = computed(() => `sv-q-${this.question().id}-title`);
  protected readonly descriptionId = computed(() => `sv-q-${this.question().id}-description`);
  protected readonly errorId = computed(() => `sv-q-${this.question().id}-error`);

  protected readonly error = computed(() => this.session.errorFor(this.question().id));

  /**
   * FR-054: the error text and the description are both associated with the control
   * through `aria-describedby`, in that order — the error is the more urgent of the two.
   */
  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.error() !== undefined) {
      ids.push(this.errorId());
    }
    if (this.question().description !== null) {
      ids.push(this.descriptionId());
    }
    return ids.length === 0 ? null : ids.join(' ');
  });
}

function viewOf(question: Question): QuestionView {
  switch (question.type) {
    case 'radio':
      return { kind: 'radio', question };
    case 'checkbox':
      return { kind: 'checkbox', question };
    case 'textbox':
    case 'textarea':
      return { kind: 'text', question };
    case 'rating':
      return { kind: 'rating', question };
    case 'satisfaction':
      return { kind: 'satisfaction', question };
  }
  // No `default` branch: a seventh type is a build failure here (plan §5.3).
  return assertNever(question);
}
