import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl:    './register.component.scss'
})
export class RegisterComponent {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);

  registerForm: FormGroup = this.fb.group({
    firstName:   ['', Validators.required],
    lastName:    ['', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
    email:       ['', [Validators.required, Validators.email]],
    password:    ['', [Validators.required, Validators.minLength(6)]]
  });

  hidePassword = signal(true);
  isLoading    = signal(false);
  errorMessage = signal<string | null>(null);
  currentYear  = new Date().getFullYear();
  protected readonly Math = Math;

  togglePassword(e: MouseEvent): void {
    e.preventDefault();
    this.hidePassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched(); return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const v = this.registerForm.value;
    this.authService.register({
      firstName:    v.firstName,
      lastName:     v.lastName,
      phoneNumber:  v.phoneNumber,
      email:        v.email,
      passwordHash: v.password
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/passenger/search']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 400 || err.status === 409
            ? 'Email or phone number already registered. Try signing in.'
            : 'Registration failed. Please try again later.'
        );
      }
    });
  }
}