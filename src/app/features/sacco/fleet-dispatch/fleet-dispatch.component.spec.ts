import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FleetDispatchComponent } from './fleet-dispatch.component';

describe('FleetDispatchComponent', () => {
  let component: FleetDispatchComponent;
  let fixture: ComponentFixture<FleetDispatchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetDispatchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FleetDispatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
