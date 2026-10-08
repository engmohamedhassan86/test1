import { TestBed } from '@angular/core/testing';
import { CatalogPageComponent } from './catalog-page';

describe('CatalogPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CatalogPageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
