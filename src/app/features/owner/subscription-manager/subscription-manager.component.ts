import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { MatIconModule }   from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatButtonModule }    from '@angular/material/button';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  OwnerService, SubscriptionStatus
} from '../../../core/services/owner.service';

@Component({
  selector: 'app-subscription-manager',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule
  ],
  templateUrl: './subscription-manager.component.html',
  styleUrl:    './subscription-manager.component.scss'
})
export class SubscriptionManagerComponent implements OnInit {

  private readonly ownerService = inject(OwnerService);
  private readonly snackBar     = inject(MatSnackBar);

  isLoading  = signal(false);
  isPaying   = signal(false);
  sub        = signal<SubscriptionStatus | null>(null);

  // Phone number validator (Matches 07..., 2547..., +2547...)
  phoneControl = new FormControl('', [
    Validators.required, 
    Validators.pattern('^(0|254|\\+254)\\d{9}$')
  ]);

  statusLabel = computed(() => {
    const s = this.sub();
    if (!s) return { text: 'Unknown', css: 'unknown' };
    if (s.active)            return { text: 'Active',   css: 'active'   };
    if (s.status === 'EXPIRED')   return { text: 'Expired',  css: 'expired'  };
    if (s.status === 'NO_SUBSCRIPTION') return { text: 'Inactive', css: 'expired' };
    return { text: s.status, css: 'pending' };
  });

  daysLeftColor = computed(() => {
    const d = this.sub()?.daysRemaining ?? 0;
    if (d > 14) return '#10b981';
    if (d > 7)  return '#f59e0b';
    return '#f43f5e';
  });

  billingHistory = signal([
    { date: new Date('2026-03-15'), desc: 'Wealth Protector Pro · 30 days', amount: 900, status: 'Paid' },
    { date: new Date('2026-02-15'), desc: 'Wealth Protector Pro · 30 days', amount: 600, status: 'Paid' },
    { date: new Date('2026-01-15'), desc: 'Wealth Protector Pro · 30 days', amount: 300, status: 'Paid' }
  ]);

  readonly columns = ['date','desc','amount','status'];

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus(): void {
    this.isLoading.set(true);
    this.ownerService.getSubscriptionStatus().subscribe({
      next:  (s) => { this.sub.set(s); this.isLoading.set(false); },
      error: ()  => this.isLoading.set(false)
    });
  }

  initiatePayment(): void {
    if (this.phoneControl.invalid) {
      this.phoneControl.markAsTouched();
      return;
    }

    this.isPaying.set(true);
    const phoneNumber = this.phoneControl.value!;
    
    // Call the real Daraja API via Spring Boot
    this.ownerService.paySubscription(phoneNumber).subscribe({
      next: (res) => {
        this.isPaying.set(false);
        this.snackBar.open(
          '📱 STK Push sent! Please enter your M-Pesa PIN on your phone.',
          'Close', { duration: 8000 }
        );
        
        // M-Pesa is asynchronous. The webhook will activate the account in a few seconds.
        // We set a timeout to automatically check the status again after 15 seconds.
        setTimeout(() => {
          this.loadStatus();
        }, 15000);
      },
      error: (err) => {
        this.isPaying.set(false);
        const msg = err.error?.error || 'Payment request failed. Try again.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}