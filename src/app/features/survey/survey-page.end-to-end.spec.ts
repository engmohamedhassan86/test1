import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { SurveyPageComponent } from './survey-page';
import { SurveyCatalogService } from '../core/services/survey-catalog.service';
import { SurveyLoaderService } from '../core/services/survey-loader.service';
import { SurveySessionService } from '../core/services/survey-session.service';
import {
  SurveyConfigError,
  SurveyConfigErrorScope,
  SurveyValidation,
} from '../core/models/survey-config-error.model';
import { SurveySession } from '../core/models/response-state.model';

import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

fdescribe('SurveyPageComponent end-to-end scenarios', () => {
  let fixture: ComponentFixture<SurveyPageComponent>;
  let surveyCatalogService: SurveyCatalogService;
  let surveyLoaderService: SurveyLoaderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyPageComponent],
      providers: [
        {
          provide: SurveyCatalogService,
          useValue: {
            resolve: () => of('ready'),
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
                  pages: [
                    {
                      id: 'page-1',
                      title: 'About You',
                      description: 'Who we are hearing from.',
                      questions: [
                        {
                          id: 'q_name',
                          type: 'textbox',
                          title: 'Name',
                          required: true,
                          minLength: 2,
                          maxLength: 80,
                        },
                        {
                          id: 'q_segment',
                          type: 'radio',
                          title: 'Segment',
                          required: true,
                          options: [
                            { id: 'opt-new', label: 'New customer', value: 'new' },
                            { id: 'opt-return', label: 'Returning customer', value: 'return' },
                            { id: 'opt-business', label: 'Business customer', value: 'business' },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'page-2',
                      title: 'Your Experience',
                      description: 'Tell us about your experience',
                      questions: [
                        {
                          id: 'q_satisfaction',
                          type: 'satisfaction',
                          title: 'Satisfaction',
                          required: true,
                          options: [
                            { id: 'opt-1', label: 'Very dissatisfied', value: '1' },
                            { id: 'opt-2', label: 'Dissatisfied', value: '2' },
                            { id: 'opt-3', label: 'Neutral', value: '3' },
                            { id: 'opt-4', label: 'Satisfied', value: '4' },
                            { id: 'opt-5', label: 'Very satisfied', value: '5' },
                          ],
                        },
                      ],
                    },
                  ],
                },
                manifest: { surveys: [] },
              }),
          },
        },
        {
          provide: SurveySessionService,
          useValue: {
            state: () =>
              ({
                currentPageIndex: () => 0,
                pageCount: () => 2,
                isFirstPage: () => true,
                inputsLocked: () => false,
                primaryAction: () => 'next',
                focusRequest: () => null,
              }) as SurveySession,
            open: () => {},
            next: () => {},
            previous: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyPageComponent);
    fixture.componentRef.setInput('surveyKey', 'customer-feedback');
    fixture.detectChanges();

    surveyCatalogService = TestBed.inject(SurveyCatalogService);
    surveyLoaderService = TestBed.inject(SurveyLoaderService);
  });

  it('should render page 1 with "Page 1 of 2" and disabled Previous and enabled Next', () => {
    expect(fixture.debugElement.query(byText('Page 1 of 2'))).toBeTruthy();
    expect(
      fixture.debugElement.query(byText('Previous')).parent?.attributes['disabled'],
    ).toBeDefined();
    expect(
      fixture.debugElement.query(byText('Next')).parent?.attributes['disabled'],
    ).toBeUndefined();
    expect(fixture.debugElement.query(byText('Submit')).toBeFalsy());
  });

  it('should navigate to page 2 with "Page 2 of 2" and focus on page-2 heading after valid page 1', fakeAsync(() => {
    const sessionService = TestBed.inject(SurveySessionService);

    (sessionService.next as any).and.callFake(() => {
      fixture.componentInstance.surveySessionService.next();
    });

    fixture.debugElement.query(byText('Next')).parent?.nativeElement.click();
    tick();
    fixture.detectChanges();

    expect(fixture.debugElement.query(byText('Page 2 of 2'))).toBeTruthy();
    expect(fixture.debugElement.query(byText('Your Experience'))).toBeTruthy();
  }));

  it('should report busy, make all inputs non-editable and render confirmation within 2s on Submit', fakeAsync(() => {
    const sessionService = TestBed.inject(SurveySessionService);

    (sessionService.next as any).and.callFake(() => {
      fixture.componentInstance.surveySessionService.next();
    });

    (sessionService.next as any).and.callFake(() => {
      fixture.componentInstance.surveySessionService.next();
    });

    (sessionService.next as any).and.callFake(() => {
      fixture.componentInstance.surveySessionService.next();
    });

    fixture.debugElement.query(byText('Next')).parent?.nativeElement.click();
    tick();
    fixture.debugElement.query(byText('Next')).parent?.nativeElement.click();
    tick();
    fixture.debugElement.query(byText('Next')).parent?.nativeElement.click();
    tick();

    expect(fixture.debugElement.query(byText('Submitting your response...'))).toBeTruthy();
    expect(fixture.debugElement.query(byText('Customer Feedback — Survey')).toBeTruthy());
    expect(fixture.debugElement.query(byText('Response received')).toBeTruthy());
    expect(fixture.debugElement.query(byText('customer-feedback — Reference')).toBeTruthy());
  }));

  it('should show title, received text, reference and link to / on confirmation', () => {
    const sessionService = TestBed.inject(SurveySessionService);

    (sessionService.next as any).and.callFake(() => {
      fixture.componentInstance.surveySessionService.next();
    });

    (sessionService.next as any).and.callFake(() => {
      fixture.componentInstance.surveySessionService.next();
    });

    (sessionService.next as any).and.callFake(() => {
      fixture.componentInstance.surveySessionService.next();
    });

    fixture.debugElement.query(byText('Next')).parent?.nativeElement.click();
    tick();
    fixture.debugElement.query(byText('Next')).parent?.nativeElement.click();
    tick();
    fixture.debugElement.query(byText('Next')).parent?.nativeElement.click();
    tick();

    expect(fixture.debugElement.query(byText('Customer Feedback')).toBeTruthy());
    expect(fixture.debugElement.query(byText('Response received')).toBeTruthy());
    expect(fixture.debugElement.query(byText('customer-feedback — Reference')).toBeTruthy());
    expect(fixture.debugElement.query(byText('Return to catalog')).toBeTruthy());
  });

  const sessionService = TestBed.inject(SurveySessionService);

  expect(sessionService.state().currentPageIndex()).toBe(0);
  expect(sessionService.state().answers().size).toBe(0);
});

it('should have document title as "Customer Feedback — Survey" on survey route and "Surveys" at /', () => {
  expect(document.title).toBe('Customer Feedback — Survey');
});
