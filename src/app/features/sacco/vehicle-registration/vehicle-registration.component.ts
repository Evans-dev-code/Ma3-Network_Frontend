import { Component, inject, signal, ViewChild, OnInit } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatSelectModule }     from '@angular/material/select';
import { MatButtonModule }     from '@angular/material/button';
import { MatIconModule }       from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { RouterModule, Router }  from '@angular/router';
import { SaccoService }          from '../../../core/services/sacco.service';

const crewEmailsValidator = (g: AbstractControl): ValidationErrors | null => {
  const d = g.get('driverEmail')?.value?.trim().toLowerCase();
  const c = g.get('conductorEmail')?.value?.trim().toLowerCase();
  return d && c && d === c ? { sameEmail: true } : null;
};

@Component({
  selector: 'app-vehicle-registration',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatStepperModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatDatepickerModule, MatSnackBarModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './vehicle-registration.component.html',
  styleUrl:    './vehicle-registration.component.scss'
})
export class VehicleRegistrationComponent implements OnInit {

  private fb           = inject(FormBuilder);
  private saccoService = inject(SaccoService);
  private router       = inject(Router);
  private snackBar     = inject(MatSnackBar);

  @ViewChild('stepper') stepper!: MatStepper;

  isLoading      = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage   = signal<string | null>(null);
  stepIndex      = signal(0);

  // ── Routes ────────────────────────────────────────────────────────
  saccoRoutes   = signal<any[]>([]);
  routesLoading = signal(false);
  showAddRoute  = signal(false);

  addRouteForm: FormGroup = this.fb.group({
    name:       ['', Validators.required],
    startPoint: ['', Validators.required],
    endPoint:   ['', Validators.required]
  });

  readonly today = new Date();

  // ── Step 1: Vehicle ───────────────────────────────────────────────
  vehicleForm: FormGroup = this.fb.group({
    plateNumber:     ['', [Validators.required,
                           Validators.pattern('^[A-Z]{3}\\s?[0-9]{3}[A-Z]$')]],
    route:           ['', Validators.required],
    capacity:        ['', [Validators.required, Validators.min(1), Validators.max(100)]],
    ntsaExpiry:      ['', Validators.required],
    insuranceExpiry: ['', Validators.required],
    tlbExpiry:       ['', Validators.required]
  });

  // ── Step 2: Owner ─────────────────────────────────────────────────
  ownerForm: FormGroup = this.fb.group({
    ownerEmail: ['', [Validators.required, Validators.email]]
  });

  // ── Step 3: Crew ──────────────────────────────────────────────────
  // Removed passwords, backend now handles token generation
  crewForm: FormGroup = this.fb.group({
    driverFirstName: ['', Validators.required],
    driverLastName:  ['', Validators.required],
    driverEmail:     ['', [Validators.required, Validators.email]],
    driverPhone:     ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
    conductorFirstName: [''],
    conductorLastName:  [''],
    conductorEmail:     ['', Validators.email],
    conductorPhone:     ['', Validators.pattern('^$|^[0-9]{10,12}$')]
  }, { validators: crewEmailsValidator });

  ngOnInit(): void {
    this.loadRoutes();
  }

  // ── Routes ────────────────────────────────────────────────────────
  loadRoutes(): void {
    this.routesLoading.set(true);
    this.saccoService.getRoutes().subscribe({
      next:  (r) => { this.saccoRoutes.set(r); this.routesLoading.set(false); },
      error: ()  => { this.routesLoading.set(false); }
    });
  }

  addRoute(): void {
    if (this.addRouteForm.invalid) { this.addRouteForm.markAllAsTouched(); return; }
    this.saccoService.createRoute(this.addRouteForm.value).subscribe({
      next: (res) => {
        this.saccoRoutes.update(r => [...r, res]);
        this.vehicleForm.get('route')?.setValue(res.name);
        this.showAddRoute.set(false);
        this.addRouteForm.reset();
        this.snackBar.open('✓ Route added', '', { duration: 2500 });
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.error ?? 'Failed to add route', 'OK', { duration: 3000 });
      }
    });
  }

  onStepChange(index: number): void { this.stepIndex.set(index); }

  get conductorEmailFilled(): boolean {
    return !!this.crewForm.get('conductorEmail')?.value?.trim();
  }

  get selectedRouteDisplay(): string {
    const name = this.vehicleForm.value.route;
    if (!name) return '';
    const found = this.saccoRoutes().find(r => r.name === name);
    return found ? found.display : name;
  }

  // ── Submit ────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.vehicleForm.invalid || this.ownerForm.invalid || this.crewForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      this.ownerForm.markAllAsTouched();
      this.crewForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const crew = this.crewForm.value;
    const conductorBlock = crew.conductorEmail?.trim()
      ? {
          conductorFirstName: crew.conductorFirstName,
          conductorLastName:  crew.conductorLastName,
          conductorEmail:     crew.conductorEmail,
          conductorPhone:     crew.conductorPhone
        }
      : {};

    const payload = {
      ...this.vehicleForm.value,
      ...this.ownerForm.value,
      driverFirstName: crew.driverFirstName,
      driverLastName:  crew.driverLastName,
      driverEmail:     crew.driverEmail,
      driverPhone:     crew.driverPhone,
      ...conductorBlock
    };

    this.saccoService.registerVehicle(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(
          `✓ ${(this.vehicleForm.value.plateNumber as string).toUpperCase()} registered successfully! Setup emails have been sent to the new crew. Redirecting...`
        );
        this.snackBar.open('Vehicle registered & emails sent!', 'Close', { duration: 4000 });
        this.vehicleForm.reset();
        this.ownerForm.reset();
        this.crewForm.reset();
        setTimeout(() => this.router.navigate(['/sacco/dispatch']), 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = typeof err.error === 'string'
          ? err.error
          : err.error?.error ?? 'Registration failed. Ensure details are correct.';
        this.errorMessage.set(msg);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  resetAll(): void {
    this.vehicleForm.reset();
    this.ownerForm.reset();
    this.crewForm.reset();
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.stepIndex.set(0);
    this.stepper?.reset();
  }
}