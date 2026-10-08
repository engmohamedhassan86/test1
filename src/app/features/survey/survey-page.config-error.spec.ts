import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { byText } from '@angular/cdk/testing/matchers';

import { SurveyPageComponent } from './survey-page';
import { SurveyCatalogService } from '../core/services/survey-catalog.service';
import { SurveyLoaderService } from '../core/services/survey-loader.service';
import {
  SurveyConfigError,
  SurveyConfigErrorScope,
  SurveyValidation,
} from '../core/models/survey-config-error.model';

import { of } from 'rxjs';

import * as invalidConfigs from '../core/validators/__fixtures__/invalid-survey-configs';
import * as invalidManifests from '../core/validators/__fixtures__/invalid-manifests';

fdescribe('SurveyPageComponent configuration-error states', () => {
  let fixture: ComponentFixture<SurveyPageComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyPageComponent],
      providers: [
        {
          provide: SurveyCatalogService,
          useValue: {
            resolve: () => of('catalog-error'),
          },
        },
        {
          provide: SurveyLoaderService,
          useValue: {
            load: () =>
              of({
                outcome: 'invalid' as const,
                error: {
                  scope: 'survey' as SurveyConfigErrorScope,
                  subject: 'customer-feedback',
                  issues: [
                    {
                      code: 'F01' as const,
                      path: 'pages[0].questions[0].type',
                      message: 'Field not valid for its question type',
                    },
                  ],
                },
              } as SurveyValidation),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyPageComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);

    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();
  });

  it('should render configuration-error screen for F01 unparseable JSON', async () => {
    expect(fixture.componentInstance.surveyScreen()).toBe('configuration-error');
    expect(fixture.componentInstance.configurationError()).not.toBeNull();

    const error = fixture.componentInstance.configurationError();
    expect(error?.scope).toBe('manifest');
    expect(error?.subject).toBe('survey-manifest.json');
    expect(error?.issues[0].code).toBe('F01');
    expect(error?.issues[0].message).toContain('Survey manifest is unreadable');
  });

  it('should render configuration-error screen for F02 missing required field', async () => {
    expect(fixture.componentInstance.surveyScreen()).toBe('configuration-error');

    const error = fixture.componentInstance.configurationError();
    expect(error?.scope).toBe('survey');
    expect(error?.subject).toBe('customer-feedback');
    expect(error?.issues[0].code).toBe('F02');
    expect(error?.issues[0].path).toBe('pages[0].questions[1].title');
    expect(error?.issues[0].message).toContain('required field missing');
  });

  it('should render configuration-error screen for F07 duplicate page id', async () => {
    expect(fixture.componentInstance.surveyScreen()).toBe('configuration-error');

    const error = fixture.componentInstance.configurationError();
    expect(error?.scope).toBe('survey');
    expect(error?.subject).toBe('customer-feedback');
    expect(error?.issues[0].code).toBe('F07');
    expect(error?.issues[0].path).toBe('pages[1].id');
    expect(error?.issues[0].message).toContain('duplicate page id');
  });

  it('should render configuration-error screen for F13 config path escapes public/', async () => {
    expect(fixture.componentInstance.surveyScreen()).toBe('configuration-error');

    const error = fixture.componentInstance.configurationError();
    expect(error?.scope).toBe('survey');
    expect(error?.subject).toBe('customer-feedback');
    expect(error?.issues[0].code).toBe('F13');
    expect(error?.issues[0].path).toBe('surveys[0].config');
    expect(error?.issues[0].message).toContain('config path escapes public');
  });
});
