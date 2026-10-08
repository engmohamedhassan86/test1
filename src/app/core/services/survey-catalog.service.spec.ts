import { TestBed } from '@angular/core/testing';
import { SurveyCatalogService } from './survey-catalog.service';
import { provideSurveyTimeouts } from './survey-timeouts';

describe('SurveyCatalogService', () => {
  let service: SurveyCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SurveyCatalogService, provideSurveyTimeouts()],
    });

    service = TestBed.inject(SurveyCatalogService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
