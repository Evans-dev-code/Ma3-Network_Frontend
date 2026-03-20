import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionManagerComponent } from './subscription-manager.component';

describe('SubscriptionManagerComponent', () => {
  let component: SubscriptionManagerComponent;
  let fixture: ComponentFixture<SubscriptionManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
