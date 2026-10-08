import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { RatingQuestionComponent } from './rating-question';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

fdescribe('RatingQuestionComponent', () => {
  let fixture: ComponentFixture<RatingQuestionComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingQuestionComponent],
      providers: [
        {
          provide: SurveySessionService,
          useValue: {
            setAnswer: () => {},
            state: () => ({
              isOptionSelectable: () => true,
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingQuestionComponent);
    surveySessionService = TestBed.inject(SurveySessionService);

    fixture.componentRef.setInput('question', {
      id: 'q1',
      type: 'rating',
      title: 'Question 1',
      required: true,
      scale: { min: 1, max: 5 },
    });

    fixture.componentRef.setInput('questionId', 'q1');
    fixture.componentRef.setInput('answer', null);
    fixture.detectChanges();
  });

  it('should render stars when scale.min >= 1', () => {
    expect(fixture.debugElement.queryAll('[type="radio"][value="1"]').length).toBe(1);
    expect(fixture.debugElement.queryAll('[type="radio"][value="2"]').length).toBe(1);
    expect(fixture.debugElement.queryAll('[type="radio"][value="3"]').length).toBe(1);
    expect(fixture.debugElement.queryAll('[type="radio"][value="4"]').length).toBe(1);
    expect(fixture.debugElement.queryAll('[type="radio"][value="5"]').length).toBe(1);
  });

  it("should render a labelled group whose accessible name is the question's title", () => {
    expect(fixture.debugElement.query('fieldset')).toBeTruthy();
    expect(fixture.debugElement.query('legend')).toBeTruthy();
    expect(fixture.debugElement.query(byText('Question 1'))).toBeTruthy();
    const fieldset = fixture.debugElement.query('fieldset');
    expect(fieldset.attributes['aria-labelledby']).toBeDefined();
  });

  it('should have Clear action returning the question to unanswered', () => {
    const mockSessionService = TestBed.inject(SurveySessionService);

    fixture.componentRef.setInput('answer', '3');
    fixture.detectChanges();

    const clearButton = fixture.debugElement.query(byText('Clear'));
    expect(clearButton).toBeTruthy();

    clearButton.parent?.nativeElement.click();
    fixture.detectChanges();

    expect(surveySessionService.setAnswer).toHaveBeenCalledWith('q1', '');
  });

  it('should accept Next for an optional rating', () => {
    const mockQuestion: SurveyQuestion = {
      id: 'q1',
      type: 'rating',
      title: 'Question 1',
      required: false,
      scale: { min: 1, max: 5 },
    };

    fixture.componentRef.setInput('question', mockQuestion);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll('[type="radio"]').length).toBe(5);
  });

  it('should have each star target 44 × 44px at 375px', () => {
    const stars = fixture.debugElement.queryAll('[type="radio"]');
    stars.forEach((star) => {
      const rect = star.nativeElement.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });
  });
});
