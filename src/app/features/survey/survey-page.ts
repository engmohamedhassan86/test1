import { Component, input } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { SurveyCatalogService } from '../core/services/survey-catalog.service';
import { SurveyLoaderService } from '../core/services/survey-loader.service';
import {
  SurveyScreen,
  SurveyKeyResolution,
  SurveyManifestEntry,
} from '../core/models/survey-manifest.model';
import {
  SurveyConfigError,
  SurveyConfigErrorScope,
  SurveyValidation,
} from '../core/models/survey-config-error.model';
import { SurveyKey } from '../core/models/branded';
import { DocumentTitleService } from '../core/services/document-title.service';
import { AnnouncerService } from '../core/services/announcer.service';
import { SurveySessionService } from '../core/services/survey-session.service';
import { ConfigurationErrorComponent } from '../shared/configuration-error';
import { NotFoundPageComponent } from '../shared/not-found-page';
import { ManifestValidation } from '../core/models/survey-config-error.model';

@Component({
  selector: 'app-survey-page',
  standalone: true,
  imports: [AsyncPipe, ConfigurationErrorComponent, NotFoundPageComponent],
  templateUrl: './survey-page.html',
  styleUrls: ['./survey-page.css'],
})
export class SurveyPageComponent {
  readonly surveyKey = input.required<SurveyKey>();

  protected readonly surveyScreen = signal<SurveyScreen>('loading');
  protected readonly configurationError = signal<SurveyConfigError | null>(null);
  protected readonly surveyKeyResolution = signal<SurveyKeyResolution>('loading');

  constructor(
    private readonly surveyCatalogService: SurveyCatalogService,
    private readonly surveyLoaderService: SurveyLoaderService,
    private readonly documentTitleService: DocumentTitleService,
    private readonly announcerService: AnnouncerService,
    protected readonly surveySessionService: SurveySessionService,
  ) {}

  ngOnInit(): void {
    this.loadSurvey();
  }

  private loadSurvey(): void {
    this.surveyCatalogService.resolve(this.surveyKey()).subscribe({
      next: (resolution) => {
        this.surveyKeyResolution.set(resolution);
        this.announceResolution(resolution);

        if (resolution === 'catalog-error') {
          this.surveyScreen.set('configuration-error');
          this.configurationError.set({
            scope: 'manifest' as SurveyConfigErrorScope,
            subject: 'survey-manifest.json',
            issues: [
              {
                code: 'F01' as const,
                path: [],
                message: 'Survey manifest is unreadable or invalid',
              },
            ],
          });
        } else if (resolution === 'not-found') {
          this.surveyScreen.set('not-found');
        } else {
          this.loadSurveyConfig();
        }
      },
      error: () => {
        this.surveyScreen.set('configuration-error');
        this.configurationError.set({
          scope: 'manifest' as SurveyConfigErrorScope,
          subject: 'survey-manifest.json',
          issues: [
            {
              code: 'F01' as const,
              path: [],
              message: 'Survey manifest is unreadable or invalid',
            },
          ],
        });
      },
    });
  }

  private loadSurveyConfig(): void {
    const entry: SurveyManifestEntry = {
      key: this.surveyKey(),
      title: '',
      config: `surveys/${this.surveyKey()}.json`,
    };

    this.surveyLoaderService.load(entry).subscribe({
      next: (validation) => {
        if (validation.outcome === 'valid') {
          this.surveySessionService.open({
            surveyKey: this.surveyKey(),
            manifest: entry,
            surveyConfig: validation.survey,
          });
          this.surveyScreen.set('ready');
        } else {
          this.surveyScreen.set('configuration-error');
          this.configurationError.set(validation.error);
        }
      },
      error: () => {
        this.surveyScreen.set('configuration-error');
        this.configurationError.set({
          scope: 'survey' as SurveyConfigErrorScope,
          subject: this.surveyKey(),
          issues: [
            {
              code: 'F01' as const,
              path: [],
              message: 'Survey configuration is unreadable or invalid',
            },
          ],
        });
      },
    });
  }

  private announceResolution(resolution: SurveyKeyResolution): void {
    switch (resolution) {
      case 'not-found':
        this.announcerService.assertive(
          `Survey ${this.surveyKey()} is not found. You will be redirected to the catalog.`,
        );
        break;
      case 'catalog-error':
        this.announcerService.assertive(
          `Unable to load survey manifest. You will be redirected to the catalog.`,
        );
        break;
      default:
        break;
    }
  }
}
