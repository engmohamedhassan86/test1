import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { SurveyNavigationComponent } from './survey-navigation';
import { SurveySessionService } from '../core/services/survey-session.service';
import { SurveySession } from '../core/models/response-state.model';

fdescribe('SurveyNavigationComponent', () => {
  let fixture: ComponentFixture<SurveyNavigationComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyNavigationComponent],
      providers: [
        {
          provide: SurveySessionService,
          useValue: {
            state: () =>
              ({
                pageCount: () => 4,
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

    fixture = TestBed.createComponent(SurveyNavigationComponent);
    surveySessionService = TestBed.inject(SurveySessionService);
    fixture.detectChanges();
  });

  it('should render "Page 1 of 4" as text', () => {
    expect(fixture.debugElement.query(byText('Page 1 of 4'))).toBeTruthy();
  });

  it('should disable Previous on page 1 and on a single-page survey', () => {
    expect(
      fixture.debugElement.query(byText('Previous')).parent?.attributes['disabled'],
    ).toBeDefined();

    const mockSessionService = TestBed.inject(SurveySessionService);
    (mockSessionService.state as any).and.returnValue({
      pageCount: () => 1,
      isFirstPage: () => true,
      inputsLocked: () => false,
      primaryAction: () => 'submit',
      focusRequest: () => null,
    });

    fixture.detectChanges();
    expect(
      fixture.debugElement.query(byText('Previous')).parent?.attributes['disabled'],
    ).toBeDefined();
  });

  it('should show Submit as the primary control only on the last page', () => {
    const mockSessionService = TestBed.inject(SurveySessionService);
    (mockSessionService.state as any).and.returnValue({
      pageCount: () => 4,
      isFirstPage: () => false,
      inputsLocked: () => false,
      primaryAction: () => 'submit',
      focusRequest: () => null,
    });

    fixture.detectChanges();
    expect(fixture.debugElement.query(byText('Submit'))).toBeTruthy();
    expect(fixture.debugElement.query(byText('Next')).toBeFalsy());
  });

  it('should show the busy state in submitting', () => {
    const mockSessionService = TestBed.inject(SurveySessionService);
    (mockSessionService.state as any).and.returnValue({
      pageCount: () => 4,
      isFirstPage: () => false,
      inputsLocked: () => true,
      primaryAction: () => 'submit',
      focusRequest: () => null,
    });

    fixture.detectChanges();
    expect(fixture.debugElement.query(byText('Submitting your response...'))).toBeTruthy();
  });
});
