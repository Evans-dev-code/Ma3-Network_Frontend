import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { MatIconModule }   from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  OwnerService, SubscriptionStatus
} from '../../../core/services/owner.service';

@Component({
  selector: 'app-subscription-manager',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './subscription-manager.component.html',
  styleUrl:    './subscription-manager.component.scss'
})
export class SubscriptionManagerComponent implements OnInit {

  private readonly ownerService = inject(OwnerService);
  private readonly snackBar     = inject(MatSnackBar);

  isLoading  = signal(false);
  isPaying   = signal(false);
  sub        = signal<SubscriptionStatus | null>(null);

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

  private loadStatus(): void {
    this.isLoading.set(true);
    this.ownerService.getSubscriptionStatus().subscribe({
      next:  (s) => { this.sub.set(s); this.isLoading.set(false); },
      error: ()  => this.isLoading.set(false)
    });
  }

  initiatePayment(): void {
    this.isPaying.set(true);
    // Simulate STK push — replace with real Daraja call
    setTimeout(() => {
      this.ownerService.activateSubscription().subscribe({
        next: (s) => {
          this.sub.set(s);
          this.isPaying.set(false);
          this.snackBar.open(
            '✓ Payment received — subscription active for 30 days',
            'Close', { duration: 4000 });
        },
        error: () => {
          this.isPaying.set(false);
          this.snackBar.open('Payment failed. Try again.', 'OK', { duration: 3000 });
        }
      });
    }, 2500);
  }
}