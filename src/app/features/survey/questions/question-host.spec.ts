import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { QuestionHostComponent } from './questions/question-host';
import { SurveyQuestion } from '../core/models/survey.model';
import { SurveySessionService } from '../core/services/survey-session.service';
import { SurveySession } from '../core/models/response-state.model';

fdescribe('QuestionHostComponent', () => {
  let fixture: ComponentFixture<QuestionHostComponent>;
  let surveySessionService: SurveySessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionHostComponent],
      providers: [
        {
          provide: SurveySessionService,
          useValue: {
            state: () => ({
              answers: () => new Map(),
              isOptionSelectable: () => true,
            }),
            setAnswer: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionHostComponent);
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

    fixture.detectChanges();
  });

  it('should route to its own component for each of the six types', () => {
    const radioQuestion = fixture.debugElement.query('[type="radio"]');
    expect(radioQuestion).toBeTruthy();

    const mockQuestion: SurveyQuestion = {
      id: 'q2',
      type: 'checkbox',
      title: 'Question 2',
      required: true,
      options: [],
    };

    fixture.componentRef.setInput('question', mockQuestion);
    fixture.detectChanges();

    const checkboxInput = fixture.debugElement.query('[type="checkbox"]');
    expect(checkboxInput).toBeTruthy();

    const textQuestion: SurveyQuestion = {
      id: 'q3',
      type: 'textbox',
      title: 'Question 3',
      required: true,
      maxLength: 80,
    };

    fixture.componentRef.setInput('question', textQuestion);
    fixture.detectChanges();

    const textInput = fixture.debugElement.query('input[type="text"]');
    expect(textInput).toBeTruthy();
  });

  it('should render the question title', () => {
    expect(fixture.debugElement.query(byText('Question 1')).toBeTruthy());
  });

  it('should render the optional description only when the config supplies one', () => {
    expect(fixture.debugElement.query(byText('Question 1')).toBeTruthy());
    expect(fixture.debugElement.query(byText('Some description')).toBeFalsy());

    const mockQuestion: SurveyQuestion = {
      id: 'q2',
      type: 'radio',
      title: 'Question 2',
      required: true,
      description: 'Some description',
      options: [],
    };

    fixture.componentRef.setInput('question', mockQuestion);
    fixture.detectChanges();

    expect(fixture.debugElement.query(byText('Some description')).toBeTruthy());
  });

  it('should show a visible required indication on a required question', () => {
    expect(fixture.debugElement.query(byText('Required')).toBeTruthy());

    const mockQuestion: SurveyQuestion = {
      id: 'q2',
      type: 'radio',
      title: 'Question 2',
      required: false,
      options: [],
    };

    fixture.componentRef.setInput('question', mockQuestion);
    fixture.detectChanges();

    expect(fixture.debugElement.query(byText('Required')).toBeFalsy());
  });
});
