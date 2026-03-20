import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseLoggerComponent } from './expense-logger.component';

describe('ExpenseLoggerComponent', () => {
  let component: ExpenseLoggerComponent;
  let fixture: ComponentFixture<ExpenseLoggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseLoggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseLoggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
