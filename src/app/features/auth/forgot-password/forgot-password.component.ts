import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service'; // Adjust path if needed

// Custom validator to ensure passwords match
const passwordMatchValidator = (g: AbstractControl): ValidationErrors | null => {
  const p = g.get('newPassword')?.value;
  const cp = g.get('confirmPassword')?.value;
  return p === cp ? null : { mismatch: true };
};

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSnackBarModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // 'request' = asking for email | 'reset' = typing new password
  mode = signal<'request' | 'reset'>('request'); 
  token = signal<string | null>(null);
  
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Toggles for password visibility
  hidePassword = signal(true);
  hideConfirm = signal(true);

  // Form 1: Asking for email
  requestForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  // Form 2: Setting the new password
  resetForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    // Check if the URL has ?token=...
    this.route.queryParams.subscribe(params => {
      const t = params['token'];
      if (t) {
        this.token.set(t);
        this.mode.set('reset'); // Switch to password entry mode
      } else {
        this.mode.set('request'); // Stay in email request mode
      }
    });
  }

  // Action for Form 1 (Sending the email)
  onRequestSubmit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const email = this.requestForm.value.email;

    this.authService.requestPasswordSetup(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`If an account exists for ${email}, a secure link has been sent. Please check your inbox.`);
        this.requestForm.reset();
      },
      error: (err) => {
        this.isLoading.set(false);
        // Standard security practice: Don't tell hackers if an email exists or not
        this.successMessage.set(`If an account exists for ${email}, a secure link has been sent. Please check your inbox.`);
        this.requestForm.reset();
      }
    });
  }

  // Action for Form 2 (Saving the new password)
  onResetSubmit(): void {
    if (this.resetForm.invalid || !this.token()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const newPass = this.resetForm.value.newPassword;

    this.authService.setupPassword(this.token()!, newPass).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Password saved successfully! Redirecting to login...');
        this.snackBar.open('Account secured', 'Close', { duration: 3000 });
        
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = typeof err.error === 'string' 
          ? err.error 
          : (err.error?.message || 'Failed to securely set password. The link might be expired.');
        this.errorMessage.set(msg);
      }
    });
  }
}