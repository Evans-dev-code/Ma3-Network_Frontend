import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaccoOnboardingComponent } from './sacco-onboarding.component';

describe('SaccoOnboardingComponent', () => {
  let component: SaccoOnboardingComponent;
  let fixture: ComponentFixture<SaccoOnboardingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaccoOnboardingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaccoOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
