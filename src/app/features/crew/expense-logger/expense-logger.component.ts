import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule
} from '@angular/forms';
import { MatCardModule }       from '@angular/material/card';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatSelectModule }     from '@angular/material/select';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatIconModule }       from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  CrewService, ExpenseResponse, MyVehicle
} from '../../../core/services/crew.service';

interface ExpenseCategoryDef {
  value: string;
  label: string;
  icon:  string;
  color: string; // for the icon circle
}

@Component({
  selector: 'app-expense-logger',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule
  ],
  templateUrl: './expense-logger.component.html',
  styleUrl:    './expense-logger.component.scss'
})
export class ExpenseLoggerComponent implements OnInit {

  private fb          = inject(FormBuilder);
  private crewService = inject(CrewService);
  private snackBar    = inject(MatSnackBar);

  // ── State ─────────────────────────────────────────────────────────────
  isLoading     = signal(false);
  myVehicle     = signal<MyVehicle | null>(null);
  todayExpenses = signal<ExpenseResponse[]>([]);
  dailyTotal    = signal(0);
  dailyFuel     = signal(0);
  dailyOther    = signal(0);

  // ── Category definitions
  // Values MUST match ExpenseCategory enum in backend exactly
  readonly expenseCategories: ExpenseCategoryDef[] = [
    { value: 'FUEL',        label: 'Fuel / Diesel',     icon: 'local_gas_station', color: '#3b82f6' },
    { value: 'STAGE_FEE',   label: 'Stage / Squad Fee', icon: 'reduce_capacity',   color: '#f59e0b' },
    { value: 'POLICE',      label: 'Police / County',   icon: 'local_police',      color: '#8b5cf6' },
    { value: 'MAINTENANCE', label: 'Repairs / Wash',    icon: 'build',             color: '#10b981' },
    { value: 'OTHER',       label: 'Other',             icon: 'receipt_long',      color: '#64748b' }
  ];

  // ── Form ──────────────────────────────────────────────────────────────
  expenseForm: FormGroup = this.fb.group({
    category:    ['', Validators.required],
    amount:      ['', [Validators.required, Validators.min(10)]],
    description: ['']
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadMyVehicle();
    this.loadTodayExpenses();
  }

  // ── Load vehicle ──────────────────────────────────────────────────────
  private loadMyVehicle(): void {
    this.crewService.getMyVehicle().subscribe({
      next:  (v) => this.myVehicle.set(v),
      error: ()  => this.snackBar.open(
        'No vehicle assigned. Contact your SACCO manager.', 'OK', { duration: 5000 })
    });
  }

  // ── Load today's expenses ─────────────────────────────────────────────
  private loadTodayExpenses(): void {
    this.crewService.getTodayExpenses().subscribe({
      next:  (expenses) => { this.todayExpenses.set(expenses); this.recalcTotals(expenses); },
      error: (err)      => console.error('Failed to load expenses', err)
    });
  }

  private recalcTotals(expenses: ExpenseResponse[]): void {
    const total = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const fuel  = expenses
      .filter(e => e.category === 'FUEL')
      .reduce((s, e) => s + Number(e.amount ?? 0), 0);
    this.dailyTotal.set(total);
    this.dailyFuel.set(fuel);
    this.dailyOther.set(total - fuel);
  }

  // ── Submit expense ────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.expenseForm.invalid) return;

    const vehicle = this.myVehicle();
    if (!vehicle) {
      this.snackBar.open('No vehicle assigned to your account.', 'OK', { duration: 4000 });
      return;
    }

    this.isLoading.set(true);

    this.crewService.logExpense({
      vehicle:     { id: vehicle.vehicleId },
      amount:      Number(this.expenseForm.value.amount),
      category:    this.expenseForm.value.category,
      description: this.expenseForm.value.description || ''
    }).subscribe({
      next: (saved) => {
        // Prepend to list so newest is at top
        this.todayExpenses.update(list => [saved, ...list]);
        this.recalcTotals(this.todayExpenses());

        this.isLoading.set(false);
        this.expenseForm.reset();
        // Clear validation state after reset
        Object.values(this.expenseForm.controls)
              .forEach(c => { c.setErrors(null); c.markAsPristine(); c.markAsUntouched(); });

        const label = this.getCategoryLabel(saved.category);
        this.snackBar.open(
          `✓ ${label} — KSh ${Number(saved.amount).toLocaleString()} recorded`,
          'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
        this.snackBar.open('Failed to save expense.', 'Close', { duration: 3000 });
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  getCategoryIcon(value: string): string {
    return this.expenseCategories.find(c => c.value === value)?.icon ?? 'receipt';
  }

  getCategoryLabel(value: string): string {
    return this.expenseCategories.find(c => c.value === value)?.label ?? value;
  }

  getCategoryColor(value: string): string {
    return this.expenseCategories.find(c => c.value === value)?.color ?? '#64748b';
  }
}