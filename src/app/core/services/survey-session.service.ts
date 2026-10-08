import { inject, Injectable, signal } from '@angular/core';
import { Survey } from '../models/survey.model';
import { SurveySession } from '../models/response-state.model';
import { JsonFetchService } from './json-fetch.service';
import { SurveyTimeouts } from './survey-timeouts';

@Injectable({ providedIn: 'root' })
export class SurveySessionService {
  private readonly surveyTimeouts = inject(SurveyTimeouts);
  private readonly jsonFetch = inject(JsonFetchService);
  private readonly manifestValidator = inject(SurveyManifestValidator);

  private readonly _state = signal<SurveySession>({ kind: 'loading', surveyKey: '' });
  readonly state = this._state.asReadonly();

  readonly answers = signal<Map<string, string | string[] | null>>(new Map());
  readonly attachments = signal<Map<string, unknown>>(new Map());
  readonly currentPageIndex = signal<number>(0);
  readonly validationErrors = signal<Map<string, string>>(new Map());

  async loadSurvey(surveyKey: string): Promise<void> {
    try {
      const survey = await this.jsonFetch.fetch<Survey>(`/api/surveys/${surveyKey}.json`);
      this._state.set({ kind: 'ready', survey });
      this.currentPageIndex.set(0);
      this.validationErrors.set(new Map());
    } catch (error) {
      this._state.set({
        kind: 'configuration-error',
        error: {
          scope: 'survey',
          subject: 'surveys',
          message: `Failed to load survey: ${error}`,
          action: null,
        },
      });
    }
  }

  setAnswer(questionId: string, value: string | string[] | null): void {
    const answers = new Map(this.answers());
    if (value === null || (Array.isArray(value) && value.length === 0)) {
      answers.delete(questionId);
    } else {
      answers.set(questionId, value);
    }
    this.answers.set(answers);
    this.validateQuestion(questionId);
    this.notifyStateChange();
  }

  addFiles(files: File[]): void {
    const attachments = new Map(this.attachments());
    files.forEach((file, index) => {
      const id = `file-${Date.now()}-${index}`;
      attachments.set(id, {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        data: file,
      });
    });
    this.attachments.set(attachments);
    this.notifyStateChange();
  }

  removeAttachment(id: string): void {
    const attachments = new Map(this.attachments());
    attachments.delete(id);
    this.attachments.set(attachments);
  }

  nextPage(): void {
    const currentIndex = this.currentPageIndex();
    const survey = this.state().survey;
    if (survey && currentIndex < survey.pages.length - 1) {
      this.currentPageIndex.set(currentIndex + 1);
      this.validationErrors.set(new Map());
      this.notifyStateChange();
    }
  }

  previousPage(): void {
    const currentIndex = this.currentPageIndex();
    if (currentIndex > 0) {
      this.currentPageIndex.set(currentIndex - 1);
      this.validationErrors.set(new Map());
      this.notifyStateChange();
    }
  }

  validateQuestion(questionId: string): void {
    const survey = this.state().survey;
    const answers = this.answers();
    const question = survey?.pages.flatMap((p) => p.questions).find((q) => q.id === questionId);

    if (!question) return;

    const errors = new Map(this.validationErrors());

    if (question.required && !answers.get(questionId)) {
      errors.set(questionId, 'This field is required');
    } else {
      errors.delete(questionId);
    }

    this.validationErrors.set(errors);
  }

  private notifyStateChange(): void {
    // Notify any listeners of state changes
    // This could be used for error announcements, etc.
  }

  reset(): void {
    this._state.set({ kind: 'loading', surveyKey: '' });
    this.answers.set(new Map());
    this.attachments.set(new Map());
    this.currentPageIndex.set(0);
    this.validationErrors.set(new Map());
  }
}
