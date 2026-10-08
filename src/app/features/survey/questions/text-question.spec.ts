import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { TextQuestionComponent } from './text-question';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

fdescribe('TextQuestionComponent', () => {
  let fixture: ComponentFixture<TextQuestionComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextQuestionComponent],
      providers: [
        {
          provide: SurveySessionService,
          useValue: {
            setAnswer: () => {},
            maxLengthOf: (question: SurveyQuestion) => question.maxLength || 80,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TextQuestionComponent);
    surveySessionService = TestBed.inject(SurveySessionService);

    fixture.componentRef.setInput('question', {
      id: 'q1',
      type: 'textbox',
      title: 'Question 1',
      required: true,
      maxLength: 80,
    });

    fixture.componentRef.setInput('questionId', 'q1');
    fixture.componentRef.setInput('answer', null);
    fixture.detectChanges();
  });

  it('should bind [maxlength]="session.maxLengthOf"', () => {
    expect(fixture.debugElement.query('[maxlength]')).toBeTruthy();
    expect(fixture.debugElement.query('[maxlength]').attributes['maxlength']).toBe('80');
  });

  it('should render both textbox and textarea through this component', () => {
    const textboxQuestion: SurveyQuestion = {
      id: 'q1',
      type: 'textbox',
      title: 'Question 1',
      required: true,
      maxLength: 80,
    };

    fixture.componentRef.setInput('question', textboxQuestion);
    fixture.detectChanges();

    expect(fixture.debugElement.query('input[type="text"]')).toBeTruthy();
    expect(fixture.debugElement.query('textarea')).toBeFalsy();

    const textareaQuestion: SurveyQuestion = {
      id: 'q2',
      type: 'textarea',
      title: 'Question 2',
      required: true,
      maxLength: 2000,
    };

    fixture.componentRef.setInput('question', textareaQuestion);
    fixture.detectChanges();

    expect(fixture.debugElement.query('input[type="text"]')).toBeFalsy();
    expect(fixture.debugElement.query('textarea')).toBeTruthy();
  });

  it("should carry a programmatic label whose accessible name is that question's title and is not wrapped in a radiogroup", () => {
    const label = fixture.debugElement.query('label');
    expect(label).toBeTruthy();
    expect(label.attributes['for']).toBeDefined();
    expect(label.textContent).toContain('Question 1');

    const radiogroup = fixture.debugElement.query('[role="radiogroup"]');
    expect(radiogroup).toBeFalsy();
  });

  it('should wire error attributes when error is present', () => {
    const mockSessionService = TestBed.inject(SurveySessionService);
    (mockSessionService.state as any).and.returnValue({
      maxLengthOf: () => 80,
    });

    fixture.componentRef.setInput('answer', '');
    fixture.detectChanges();

    const input = fixture.debugElement.query('[maxlength]');
    expect(input.attributes['aria-invalid']).toBe('true');
    expect(input.attributes['aria-describedby']).toBeDefined();
  });
});
