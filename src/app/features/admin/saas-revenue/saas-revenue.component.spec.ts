import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaasRevenueComponent } from './saas-revenue.component';

describe('SaasRevenueComponent', () => {
  let component: SaasRevenueComponent;
  let fixture: ComponentFixture<SaasRevenueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaasRevenueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaasRevenueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
