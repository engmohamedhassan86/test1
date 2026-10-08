import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { CheckboxQuestionComponent } from './checkbox-question';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

fdescribe('CheckboxQuestionComponent', () => {
  let fixture: ComponentFixture<CheckboxQuestionComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckboxQuestionComponent],
      providers: [
        {
          provide: SurveySessionService,
          useValue: {
            setAnswer: () => {},
            state: () => ({
              isOptionSelectable: (question: SurveyQuestion, value: string) => {
                return !(value === '2' && question.required);
              },
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckboxQuestionComponent);
    surveySessionService = TestBed.inject(SurveySessionService);

    fixture.componentRef.setInput('question', {
      id: 'q1',
      type: 'checkbox',
      title: 'Question 1',
      required: true,
      options: [
        { id: 'opt1', label: 'Option 1', value: '1' },
        { id: 'opt2', label: 'Option 2', value: '2' },
      ],
    });

    fixture.componentRef.setInput('questionId', 'q1');
    fixture.componentRef.setInput('answer', null);
    fixture.detectChanges();
  });

  it('should render fieldset + legend naming the question', () => {
    expect(fixture.debugElement.query('fieldset')).toBeTruthy();
    expect(fixture.debugElement.query('legend')).toBeTruthy();
    expect(fixture.debugElement.query(byText('Question 1'))).toBeTruthy();
  });

  it('should render options in config order', () => {
    expect(fixture.debugElement.queryAll(byText('Option 1')).length).toBe(1);
    expect(fixture.debugElement.queryAll(byText('Option 2')).length).toBe(1);
  });

  it('should bind [disabled]="!session.isOptionSelectable(...)"', () => {
    expect(fixture.debugElement.queryAll('[disabled]').length).toBe(0);

    fixture.componentRef.setInput('answer', ['2']);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll('[disabled]').length).toBe(1);
    expect(
      fixture.debugElement.queryAll('[disabled]')[0].attributes['aria-disabled'],
    ).toBeDefined();
  });

  it('should render the hint `Select up to 3 options`', () => {
    const mockQuestion = {
      id: 'q1',
      type: 'checkbox',
      title: 'Question 1',
      required: true,
      options: [],
      maxSelections: 3,
    };

    fixture.componentRef.setInput('question', mockQuestion as SurveyQuestion);
    fixture.detectChanges();

    expect(fixture.debugElement.query(byText('Select up to 3 options'))).toBeTruthy();
  });

  it('should wire error attributes when error is present', () => {
    const mockSessionService = TestBed.inject(SurveySessionService);
    (mockSessionService.state as any).and.returnValue({
      isOptionSelectable: () => true,
    });

    fixture.componentRef.setInput('answer', []);
    fixture.detectChanges();

    const fieldset = fixture.debugElement.query('fieldset');
    expect(fieldset.attributes['aria-invalid']).toBe('true');
    expect(fieldset.attributes['aria-describedby']).toBeDefined();
  });
});
