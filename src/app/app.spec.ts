import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';

describe('App', () => {
  let fixture: ComponentFixture<AppComponent>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
  });

  it('creates the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the skip link that targets the main landmark', () => {
    expect(host().querySelector('a.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(host().querySelector('main')?.id).toBe('main-content');
  });

  it('renders the live region components', () => {
    expect(host().querySelector('app-live-region')).not.toBeNull();
  });

  it('renders the router outlet', () => {
    expect(host().querySelector('router-outlet')).not.toBeNull();
  });
});
