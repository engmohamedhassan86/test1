import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { SurveyPageBodyComponent } from './survey-page-body';
import { SurveySessionService } from '../core/services/survey-session.service';
import { SurveySession } from '../core/models/response-state.model';

fdescribe('SurveyPageBodyComponent', () => {
  let fixture: ComponentFixture<SurveyPageBodyComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyPageBodyComponent],
      providers: [
        {
          provide: SurveySessionService,
          useValue: {
            state: () =>
              ({
                survey: () => ({
                  title: 'Customer Feedback',
                  description: 'Four short pages about your recent order.',
                  pages: [
                    {
                      id: 'page-1',
                      title: 'About You',
                      description: 'Who we are hearing from.',
                      questions: [],
                    },
                  ],
                }),
                currentPageIndex: () => 0,
                pageCount: () => 1,
                isFirstPage: () => true,
                inputsLocked: () => false,
                primaryAction: () => 'next',
                focusRequest: () => null,
              }) as SurveySession,
            next: () => {},
            previous: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyPageBodyComponent);
    surveySessionService = TestBed.inject(SurveySessionService);
    fixture.detectChanges();
  });

  it('should render the survey description above the page title', () => {
    expect(
      fixture.debugElement
        .query(byText('Four short pages about your recent order.'))
        .before(byText('About You')),
    ).toBeTruthy();
  });

  it('should render the page description below the page title', () => {
    expect(
      fixture.debugElement
        .query(byText('About You'))
        .after(byText('Who we are hearing from.'))
        .toBeTruthy(),
    );
  });

  it('should leave no empty element for a page without description', () => {
    const mockSessionService = TestBed.inject(SurveySessionService);
    (mockSessionService.state as any).and.returnValue({
      survey: () => ({
        title: 'Customer Feedback',
        description: 'Four short pages about your recent order.',
        pages: [
          {
            id: 'page-1',
            title: 'About You',
            description: undefined,
            questions: [],
          },
        ],
      }),
      currentPageIndex: () => 0,
      pageCount: () => 1,
      isFirstPage: () => true,
      inputsLocked: () => false,
      primaryAction: () => 'next',
      focusRequest: () => null,
    });

    fixture.detectChanges();
    expect(fixture.debugElement.query(byText('About You'))).toBeTruthy();
    expect(fixture.debugElement.query(byText('Who we are hearing from.')).toBeFalsy());
  });

  it('should render its title and navigation for a page with zero questions', () => {
    expect(fixture.debugElement.query(byText('About You'))).toBeTruthy();
    expect(
      fixture.debugElement.query(byText('Previous')).parent?.attributes['disabled'],
    ).toBeDefined();
    expect(
      fixture.debugElement.query(byText('Next')).parent?.attributes['disabled'],
    ).toBeUndefined();
  });
});
