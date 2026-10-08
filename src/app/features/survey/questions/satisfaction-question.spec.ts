import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { SatisfactionQuestionComponent } from './satisfaction-question';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

fdescribe('SatisfactionQuestionComponent', () => {
  let fixture: ComponentFixture<SatisfactionQuestionComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SatisfactionQuestionComponent],
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

    fixture = TestBed.createComponent(SatisfactionQuestionComponent);
    surveySessionService = TestBed.inject(SurveySessionService);

    fixture.componentRef.setInput('question', {
      id: 'q1',
      type: 'satisfaction',
      title: 'Question 1',
      required: true,
      satisfactionLabels: [
        'Very dissatisfied',
        'Dissatisfied',
        'Neutral',
        'Satisfied',
        'Very satisfied',
      ],
    });

    fixture.componentRef.setInput('questionId', 'q1');
    fixture.componentRef.setInput('answer', null);
    fixture.detectChanges();
  });

  it('should render exactly five choices with the five visible labels', () => {
    expect(fixture.debugElement.queryAll(byText('Very dissatisfied')).length).toBe(1);
    expect(fixture.debugElement.queryAll(byText('Dissatisfied')).length).toBe(1);
    expect(fixture.debugElement.queryAll(byText('Neutral')).length).toBe(1);
    expect(fixture.debugElement.queryAll(byText('Satisfied')).length).toBe(1);
    expect(fixture.debugElement.queryAll(byText('Very satisfied')).length).toBe(1);
  });

  it("should have a labelled group whose accessible name is the question's title", () => {
    expect(fixture.debugElement.query('fieldset')).toBeTruthy();
    expect(fixture.debugElement.query('legend')).toBeTruthy();
    expect(fixture.debugElement.query(byText('Question 1'))).toBeTruthy();
    const fieldset = fixture.debugElement.query('fieldset');
    expect(fieldset.attributes['aria-labelledby']).toBeDefined();
  });

  it('should store the integer when selected', () => {
    const option4 = fixture.debugElement.queryAll('input[type="radio"][value="4"]')[0];
    option4.nativeElement.click();
    fixture.detectChanges();

    expect(surveySessionService.setAnswer).toHaveBeenCalledWith('q1', 4);
  });

  it('should offer no sixth and no zero value', () => {
    expect(fixture.debugElement.queryAll('input[type="radio"][value="0"]')).toHaveSize(0);
    expect(fixture.debugElement.queryAll('input[type="radio"][value="6"]')).toHaveSize(0);
    expect(fixture.debugElement.queryAll('input[type="radio"][value="1"]').length).toBe(5);
  });
});
