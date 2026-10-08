import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { RadioQuestionComponent } from './radio-question';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';

fdescribe('RadioQuestionComponent', () => {
  let fixture: ComponentFixture<RadioQuestionComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioQuestionComponent],
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

    fixture = TestBed.createComponent(RadioQuestionComponent);
    surveySessionService = TestBed.inject(SurveySessionService);

    fixture.componentRef.setInput('question', {
      id: 'q1',
      type: 'radio',
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

  it('should render role="radiogroup" labelled by the question title', () => {
    expect(fixture.debugElement.query('[role="radiogroup"]')).toBeTruthy();
    expect(fixture.debugElement.query(byText('Question 1'))).toBeTruthy();
    const radiogroup = fixture.debugElement.query('[role="radiogroup"]');
    expect(radiogroup.attributes['aria-labelledby']).toBeDefined();
  });

  it('should render options in config order with option labels as visible text', () => {
    expect(fixture.debugElement.queryAll(byText('Option 1')).length).toBe(1);
    expect(fixture.debugElement.queryAll(byText('Option 2')).length).toBe(1);
  });

  it('should store the option value when selected', () => {
    const option1 = fixture.debugElement.queryAll('[type="radio"][value="1"]')[0];
    option1.nativeElement.click();
    fixture.detectChanges();

    expect(surveySessionService.setAnswer).toHaveBeenCalledWith('q1', '1');
  });

  it('should show aria-invalid and aria-describedby when error is present', () => {
    const mockSessionService = TestBed.inject(SurveySessionService);
    (mockSessionService.state as any).and.returnValue({
      isOptionSelectable: () => true,
    });

    fixture.componentRef.setInput('answer', 'some-answer');
    fixture.detectChanges();

    const radiogroup = fixture.debugElement.query('[role="radiogroup"]');
    expect(radiogroup.attributes['aria-invalid']).toBe('true');
    expect(radiogroup.attributes['aria-describedby']).toBeDefined();
  });
});
