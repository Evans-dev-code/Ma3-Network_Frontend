import { Component, inject, signal, computed } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators,
  ReactiveFormsModule, AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule }  from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule }   from '@angular/common';
import { AdminService }   from '../../../core/services/admin.service';

// ── Tier definitions ──────────────────────────────────────────────────
export interface SaccoTier {
  value:       string;
  label:       string;
  description: string;
  max:         number;
  fee:         number;
  setupFee:    number;
  color:       string;
}

@Component({
  selector: 'app-sacco-onboarding',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatIconModule, MatSnackBarModule
  ],
  templateUrl: './sacco-onboarding.component.html',
  styleUrl:    './sacco-onboarding.component.scss'
})
export class SaccoOnboardingComponent {

  private fb           = inject(FormBuilder);
  private adminService = inject(AdminService);
  private router       = inject(Router);
  private snackBar     = inject(MatSnackBar);

  isLoading      = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage   = signal<string | null>(null);

  readonly tiers: SaccoTier[] = [
    {
      value:       'SACCO_TIER_1',
      label:       'Tier 1 — Basic',
      description: 'Up to 50 vehicles · Ideal for small SACCOs starting out',
      max:         50,
      fee:         2000,
      setupFee:    5000,
      color:       '#3b82f6'
    },
    {
      value:       'SACCO_TIER_2',
      label:       'Tier 2 — Standard',
      description: '51–150 vehicles · Most popular for mid-size fleets',
      max:         150,
      fee:         5000,
      setupFee:    10000,
      color:       '#10b981'
    },
    {
      value:       'SACCO_TIER_3',
      label:       'Tier 3 — Enterprise',
      description: '150+ vehicles · Full platform access for large SACCOs',
      max:         500,
      fee:         10000,
      setupFee:    20000,
      color:       '#8b5cf6'
    }
  ];

  selectedTier = signal<SaccoTier | null>(null);

  onboardingForm: FormGroup = this.fb.group({
    saccoName:          ['', [Validators.required, Validators.minLength(3)]],
    tier:               ['', Validators.required],
    registrationNumber: ['', Validators.required],
    contactPhone:       ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
    setupFee:           [5000, [Validators.required, Validators.min(0)]],
    managerFirstName:   ['', Validators.required],
    managerLastName:    ['', Validators.required],
    managerEmail:       ['', [Validators.required, Validators.email]],
    managerPhone:       ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]]
  });

  onTierSelect(tier: SaccoTier): void {
    this.selectedTier.set(tier);
    this.onboardingForm.patchValue({
      tier:     tier.value,
      setupFee: tier.setupFee
    });
  }

  onSubmit(): void {
    if (this.onboardingForm.invalid) {
      this.onboardingForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const fv   = this.onboardingForm.value;
    const tier = this.tiers.find(t => t.value === fv.tier);

    const payload = {
      ...fv,
      maxVehicles: tier?.max    ?? 50,
      monthlyFee:  tier?.fee    ?? 2000
    };

    this.adminService.onboardSacco(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(
          `✓ ${fv.saccoName} onboarded successfully! Manager login sent to ${fv.managerEmail} with default password: Default@123`
        );
        this.snackBar.open(
          `${fv.saccoName} is now live on the platform`, 'Close', { duration: 4000 });
        this.onboardingForm.reset({ setupFee: 5000 });
        this.selectedTier.set(null);
        setTimeout(() => this.router.navigate(['/admin/billing']), 4000);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = typeof err.error === 'string'
          ? err.error
          : err.error?.message ?? 'Onboarding failed. Check inputs and try again.';
        this.errorMessage.set(msg);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}