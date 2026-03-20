import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplianceTrackerComponent } from './compliance-tracker.component';

describe('ComplianceTrackerComponent', () => {
  let component: ComplianceTrackerComponent;
  let fixture: ComponentFixture<ComplianceTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComplianceTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
