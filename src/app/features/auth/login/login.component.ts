import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss'
})
export class LoginComponent {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);

  loginForm: FormGroup = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  hidePassword = signal(true);
  isLoading    = signal(false);
  errorMessage = signal<string | null>(null);
  currentYear   = new Date().getFullYear();

  togglePassword(e: MouseEvent): void {
    e.preventDefault();
    this.hidePassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.routeByRole();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 401 || err.status === 403
            ? 'Invalid email or password. Please try again.'
            : 'Connection error. Please try again later.'
        );
      }
    });
  }

  private routeByRole(): void {
    const routes: Record<string, string> = {
      SUPER_ADMIN:   '/admin/billing',
      SACCO_MANAGER: '/sacco/dispatch',
      OWNER:         '/owner/analytics',
      CREW:          '/crew/operations'
    };
    const role = this.authService.getUserRole() ?? '';
    this.router.navigate([routes[role] ?? '/passenger/search']);
  }
}