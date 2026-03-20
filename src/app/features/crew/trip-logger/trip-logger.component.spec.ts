import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripLoggerComponent } from './trip-logger.component';

describe('TripLoggerComponent', () => {
  let component: TripLoggerComponent;
  let fixture: ComponentFixture<TripLoggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripLoggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripLoggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
