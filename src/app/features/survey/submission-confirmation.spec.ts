import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byText } from '@angular/cdk/testing/matchers';

import { SubmissionConfirmationComponent } from './submission-confirmation';

fdescribe('SubmissionConfirmationComponent', () => {
  let fixture: ComponentFixture<SubmissionConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmissionConfirmationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionConfirmationComponent);
    fixture.componentRef.setInput('surveyTitle', 'Customer Feedback');
    fixture.componentRef.setInput('submissionId', 'submission-123');
    fixture.detectChanges();
  });

  it('should render the title', () => {
    expect(fixture.debugElement.query(byText('Customer Feedback')).toBeTruthy());
  });

  it('should render the received text', () => {
    expect(fixture.debugElement.query(byText('Response received')).toBeTruthy());
  });

  it('should render the reference', () => {
    expect(fixture.debugElement.query(byText('submission-123')).toBeTruthy());
  });

  it('should render the link to /', () => {
    expect(fixture.debugElement.query(byText('Return to catalog')).toBeTruthy());
  });

  it('should render no question control', () => {
    expect(fixture.debugElement.queryAll('input[type="text"]')).toHaveSize(0);
    expect(fixture.debugElement.queryAll('textarea')).toHaveSize(0);
    expect(fixture.debugElement.queryAll('[role="radio"]')).toHaveSize(0);
    expect(fixture.debugElement.queryAll('[type="checkbox"]')).toHaveSize(0);
  });
});
