import { TestBed } from '@angular/core/testing';
import { SurveyLoaderService } from './survey-loader.service';
import { provideSurveyTimeouts } from './survey-timeouts';

describe('SurveyLoaderService', () => {
  let service: SurveyLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SurveyLoaderService, provideSurveyTimeouts()],
    });

    service = TestBed.inject(SurveyLoaderService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
