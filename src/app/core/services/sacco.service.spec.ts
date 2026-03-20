import { TestBed } from '@angular/core/testing';

import { SaccoService } from './sacco.service';

describe('SaccoService', () => {
  let service: SaccoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaccoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
