import { inject, Injectable, signal } from '@angular/core';

import { SurveyResponseGateway } from './survey-response.gateway';
import { SurveyResponse } from '../models/survey-response.model';
import { SubmissionReceiptValidator } from '../validators/submission-receipt.validator';

@Injectable({ providedIn: 'root' })
export class SimulatedSurveyResponseGateway implements SurveyResponseGateway {
  private readonly receiptValidator = inject(SubmissionReceiptValidator);
  private submissionCount = signal(0);

  async submit(
    response: SurveyResponse,
    signal: AbortSignal,
  ): Promise<{ submissionId: string; receivedAt: string }> {
    this.submissionCount.update((count) => count + 1);
    const submissionId = `simulated-${Date.now()}-${this.submissionCount()}`;
    const receivedAt = new Date().toISOString();

    return Promise.resolve({ submissionId, receivedAt });
  }
}
