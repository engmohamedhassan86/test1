import { ComponentFixture, TestBed } from '@angular/core/testing';
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

fdescribe('SurveyPageComponent state rendering', () => {
  let fixture: ComponentFixture<SurveyPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyPageComponent],
      providers: [
        {
          provide: SurveyCatalogService,
          useValue: {
            resolve: () => of('not-found'),
          },
        },
        {
          provide: SurveyLoaderService,
          useValue: {
            load: () =>
              of({
                outcome: 'valid' as const,
                survey: {
                  key: 'customer-feedback',
                  title: 'Customer Feedback',
                  description: 'Four short pages about your recent order.',
                  pages: [],
                },
                manifest: { surveys: [] },
              } as SurveyValidation),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyPageComponent);
    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();
  });

  it('should render loading state with busy indication and no question controls', () => {
    const pageState = fixture.componentInstance.surveyScreen();
    expect(pageState).toBe('loading');
    expect(fixture.debugElement.query(byText('Loading survey...'))).toBeTruthy();
    expect(fixture.debugElement.queryAll('[class*="question"]')).toHaveSize(0);
  });

  it('should render not-found state without question controls', () => {
    fixture.componentRef.setInput('surveyKey', 'non-existent-survey');
    fixture.componentRef.setInput('surveyKey', 'non-existent-survey');
    fixture.detectChanges();

    const pageState = fixture.componentInstance.surveyScreen();
    expect(pageState).toBe('not-found');
    expect(fixture.debugElement.query(byText('Survey not found'))).toBeTruthy();
    expect(fixture.debugElement.queryAll('[class*="question"]')).toHaveSize(0);
  });

  it('should render configuration-error state without question controls', () => {
    const notFoundCatalogService = TestBed.inject(SurveyCatalogService);
    (notFoundCatalogService.resolve as any).and.returnValue(of('catalog-error'));

    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();

    const pageState = fixture.componentInstance.surveyScreen();
    expect(pageState).toBe('configuration-error');
    expect(fixture.componentInstance.configurationError()).not.toBeNull();
    expect(fixture.debugElement.queryAll('[class*="question"]')).toHaveSize(0);
  });

  it('should render ready state with question controls', () => {
    const readyCatalogService = TestBed.inject(SurveyCatalogService);
    const notFoundLoaderService = TestBed.inject(SurveyLoaderService);

    (readyCatalogService.resolve as any).and.returnValue(of('ready'));
    (notFoundLoaderService.load as any).and.returnValue(
      of({
        outcome: 'valid' as const,
        survey: {
          key: 'customer-feedback',
          title: 'Customer Feedback',
          description: 'Four short pages about your recent order.',
          pages: [
            {
              id: 'page-1',
              title: 'Page 1',
              description: 'First page',
              questions: [
                {
                  id: 'q1',
                  type: 'radio',
                  title: 'Question 1',
                  required: true,
                  options: [
                    { id: 'opt1', label: 'Option 1', value: '1' },
                    { id: 'opt2', label: 'Option 2', value: '2' },
                  ],
                },
              ],
            },
          ],
        },
        manifest: { surveys: [] },
      }),
    );

    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();

    const pageState = fixture.componentInstance.surveyScreen();
    expect(pageState).toBe('ready');
    expect(fixture.debugElement.query(byText('Customer Feedback'))).toBeTruthy();
    expect(fixture.debugElement.queryAll('[class*="question"]')).toHaveSize(1);
  });

  it('should render editing state with question controls', () => {
    const editingCatalogService = TestBed.inject(SurveyCatalogService);
    const editingLoaderService = TestBed.inject(SurveyLoaderService);

    (editingCatalogService.resolve as any).and.returnValue(of('ready'));
    (editingLoaderService.load as any).and.returnValue(
      of({
        outcome: 'valid' as const,
        survey: {
          key: 'customer-feedback',
          title: 'Customer Feedback',
          description: 'Four short pages about your recent order.',
          pages: [
            {
              id: 'page-1',
              title: 'Page 1',
              description: 'First page',
              questions: [
                {
                  id: 'q1',
                  type: 'radio',
                  title: 'Question 1',
                  required: true,
                  options: [
                    { id: 'opt1', label: 'Option 1', value: '1' },
                    { id: 'opt2', label: 'Option 2', value: '2' },
                  ],
                },
              ],
            },
          ],
        },
        manifest: { surveys: [] },
      }),
    );

    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();

    const pageState = fixture.componentInstance.surveyScreen();
    expect(pageState).toBe('editing');
    expect(fixture.debugElement.query(byText('Customer Feedback'))).toBeTruthy();
    expect(fixture.debugElement.queryAll('[class*="question"]')).toHaveSize(1);
  });

  it('should render submitting state without question controls', () => {
    const submittingCatalogService = TestBed.inject(SurveyCatalogService);
    const submittingLoaderService = TestBed.inject(SurveyLoaderService);

    (submittingCatalogService.resolve as any).and.returnValue(of('ready'));
    (submittingLoaderService.load as any).and.returnValue(
      of({
        outcome: 'valid' as const,
        survey: {
          key: 'customer-feedback',
          title: 'Customer Feedback',
          description: 'Four short pages about your recent order.',
          pages: [
            {
              id: 'page-1',
              title: 'Page 1',
              description: 'First page',
              questions: [
                {
                  id: 'q1',
                  type: 'radio',
                  title: 'Question 1',
                  required: true,
                  options: [
                    { id: 'opt1', label: 'Option 1', value: '1' },
                    { id: 'opt2', label: 'Option 2', value: '2' },
                  ],
                },
              ],
            },
          ],
        },
        manifest: { surveys: [] },
      }),
    );

    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();

    const pageState = fixture.componentInstance.surveyScreen();
    expect(pageState).toBe('submitting');
    expect(fixture.debugElement.query(byText('Submitting your response...'))).toBeTruthy();
    expect(fixture.debugElement.queryAll('[class*="question"]')).toHaveSize(0);
  });

  it('should render submitted state without question controls', () => {
    const submittedCatalogService = TestBed.inject(SurveyCatalogService);
    const submittedLoaderService = TestBed.inject(SurveyLoaderService);

    (submittedCatalogService.resolve as any).and.returnValue(of('ready'));
    (submittedLoaderService.load as any).and.returnValue(
      of({
        outcome: 'valid' as const,
        survey: {
          key: 'customer-feedback',
          title: 'Customer Feedback',
          description: 'Four short pages about your recent order.',
          pages: [
            {
              id: 'page-1',
              title: 'Page 1',
              description: 'First page',
              questions: [
                {
                  id: 'q1',
                  type: 'radio',
                  title: 'Question 1',
                  required: true,
                  options: [
                    { id: 'opt1', label: 'Option 1', value: '1' },
                    { id: 'opt2', label: 'Option 2', value: '2' },
                  ],
                },
              ],
            },
          ],
        },
        manifest: { surveys: [] },
      }),
    );

    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();

    const pageState = fixture.componentInstance.surveyScreen();
    expect(pageState).toBe('submitted');
    expect(fixture.debugElement.query(byText('Response received'))).toBeTruthy();
    expect(fixture.debugElement.queryAll('[class*="question"]')).toHaveSize(0);
  });
});
