import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  it('creates the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the app title in a level-one heading', () => {
    expect(host().querySelector('h1')?.textContent).toContain('Dynamic Survey Viewer');
  });

  it('exposes a skip link that targets the main landmark', () => {
    expect(host().querySelector('a.sv-skip-link')?.getAttribute('href')).toBe('#main');
    expect(host().querySelector('main')?.id).toBe('main');
  });

  it('renders one list item per foundation check', () => {
    const items = host().querySelectorAll('.sv-checks li');
    expect(items.length).toBe(5);
    expect(items[0].textContent).toContain('Angular 22 standalone components');
  });

  it('renders a PrimeNG button for the theme probe', () => {
    expect(host().querySelector('button.p-button')).not.toBeNull();
  });

  it('keeps the status live region empty until the probe is activated', () => {
    const status = host().querySelector('.sv-probe-status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent?.trim()).toBe('');
  });

  it('announces confirmation and disables the button after activation', async () => {
    const button = host().querySelector<HTMLButtonElement>('button.p-button');
    expect(button?.disabled).toBe(false);

    button?.click();
    await fixture.whenStable();

    expect(host().querySelector('.sv-probe-status')?.textContent).toContain('Theme confirmed');
    expect(host().querySelector<HTMLButtonElement>('button.p-button')?.disabled).toBe(true);
  });

  it('does not re-announce when the probe is activated twice', async () => {
    const button = host().querySelector<HTMLButtonElement>('button.p-button');

    button?.click();
    await fixture.whenStable();
    button?.click();
    await fixture.whenStable();

    const announcements = host().querySelectorAll('.sv-probe-status span');
    expect(announcements.length).toBe(1);
  });
});
