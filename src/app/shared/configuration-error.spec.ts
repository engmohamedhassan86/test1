import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigurationErrorComponent } from './configuration-error';

import { By } from '@angular/platform-browser';
import { Component, input } from '@angular/core';

@Component({ standalone: true, template: '<app-not-found-page [key]="key"></app-not-found-page>' })
export class NotFoundPageComponent {
  @Input() key!: string;
}

@Component({ standalone: true, template: '<app-live-region></app-live-region>' })
export class LiveRegionComponent {}

fdescribe('ConfigurationErrorComponent', () => {
  let fixture: ComponentFixture<ConfigurationErrorComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurationErrorComponent, NotFoundPageComponent, LiveRegionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigurationErrorComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should render both scopes with issue names and paths', () => {
    const manifestIssues: SurveyConfigError['issues'] = [
      {
        code: 'F01' as const,
        path: 'surveys',
        message: 'The survey manifest could not be read',
      },
    ];

    const surveyIssues: SurveyConfigError['issues'] = [
      {
        code: 'F12' as const,
        path: 'pages[0].questions[0].maxSelections',
        message: 'Selection rule unsatisfiable',
      },
    ];

    fixture.componentRef.setInput('scope', 'manifest');
    fixture.componentRef.setInput('subject', 'survey-manifest.json');
    fixture.componentRef.setInput('issues', manifestIssues);
    fixture.detectChanges();

    const componentElement = fixture.nativeElement as HTMLElement;
    expect(componentElement.querySelector('h2')?.textContent).toContain('Error');
    expect(componentElement.textContent).toContain('surveys');
    expect(componentElement.textContent).toContain('The survey manifest could not be read');

    fixture.componentRef.setInput('scope', 'survey');
    fixture.componentRef.setInput('subject', 'customer-feedback');
    fixture.componentRef.setInput('issues', surveyIssues);
    fixture.detectChanges();

    expect(componentElement.querySelector('h2')?.textContent).toContain('Error');
    expect(componentElement.textContent).toContain('pages[0].questions[0].maxSelections');
    expect(componentElement.textContent).toContain('Selection rule unsatisfiable');
  });

  it('should render the link to catalog', () => {
    const issues: SurveyConfigError['issues'] = [
      {
        code: 'F01' as const,
        path: '',
        message: 'Test error',
      },
    ];

    fixture.componentRef.setInput('scope', 'manifest');
    fixture.componentRef.setInput('subject', 'survey-manifest.json');
    fixture.componentRef.setInput('issues', issues);
    fixture.detectChanges();

    const linkElement = fixture.nativeElement.querySelector('a');
    expect(linkElement).toBeTruthy();
    expect(linkElement?.getAttribute('href')).toBe('/');
  });
});
