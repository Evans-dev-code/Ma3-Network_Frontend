import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule }   from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from '../../../core/services/admin.service';

export interface SaccoRow {
  id:                      number;
  name:                    string;
  vehicleCount:            number;
  totalRevenueContributed: number;
  status:                  string;
  managerEmail:            string;
}

@Component({
  selector: 'app-saas-revenue',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './saas-revenue.component.html',
  styleUrl:    './saas-revenue.component.scss'
})
export class SaasRevenueComponent implements OnInit {

  private adminService = inject(AdminService);
  private snackBar     = inject(MatSnackBar);

  isLoading = signal(true);

  // ── Platform KPIs ──────────────────────────────────────────────────
  totalPlatformRevenue    = signal(0);
  monthlyRecurringRevenue = signal(0);
  ownerMrr                = signal(0);
  saccoMrr                = signal(0);
  totalSaccos             = signal(0);
  totalVehicles           = signal(0);
  activeVehicles          = signal(0);
  totalOwners             = signal(0);
  totalCrew               = signal(0);
  totalManagers           = signal(0);
  totalUsers              = signal(0);
  activeSubscriptions     = signal(0);
  subscribedOwners        = signal(0);

  // ── Chart Data ─────────────────────────────────────────────────────
  revenueBreakdown = signal<{ name: string; value: number; color: string }[]>([]);
  forecastSeries   = signal<{ name: string; value: number }[]>([]);
  growthTrend      = signal<{ name: string; value: number }[]>([]);

  // ── Table ──────────────────────────────────────────────────────────
  saccoTable = signal<SaccoRow[]>([]);

  // ── Computed ───────────────────────────────────────────────────────
  subscriptionRate = computed(() => {
    const o = this.totalOwners();
    return o > 0 ? Math.round((this.subscribedOwners() / o) * 100) : 0;
  });

  utilizationRate = computed(() => {
    const t = this.totalVehicles();
    return t > 0 ? Math.round((this.activeVehicles() / t) * 100) : 0;
  });

  forecastMax = computed(() =>
    Math.max(...this.forecastSeries().map(p => p.value), 1));

  growthMax = computed(() =>
    Math.max(...this.growthTrend().map(p => p.value), 1));

  breakdownTotal = computed(() =>
    this.revenueBreakdown().reduce((a, b) => a + b.value, 0));

  private readonly COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#f43f5e','#06b6d4'];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.adminService.getAnalytics().subscribe({
      next: (d) => {
        this.totalPlatformRevenue.set(d.totalPlatformRevenue ?? 0);
        this.monthlyRecurringRevenue.set(d.monthlyRecurringRevenue ?? 0);
        this.ownerMrr.set(d.ownerMrr ?? 0);
        this.saccoMrr.set(d.saccoMrr ?? 0);
        this.totalSaccos.set(d.totalSaccos ?? 0);
        this.totalVehicles.set(d.totalVehicles ?? 0);
        this.activeVehicles.set(d.activeVehicles ?? 0);
        this.totalOwners.set(d.totalOwners ?? 0);
        this.totalCrew.set(d.totalCrew ?? 0);
        this.totalManagers.set(d.totalManagers ?? 0);
        this.totalUsers.set(d.totalUsers ?? 0);
        this.activeSubscriptions.set(d.activeSubscriptions ?? 0);
        this.subscribedOwners.set(d.subscribedOwners ?? 0);

        const colored = (d.revenueBreakdown ?? []).map(
          (r: any, i: number) => ({ ...r, color: this.COLORS[i % this.COLORS.length] }));
        this.revenueBreakdown.set(colored);

        const fs = d.forecastSeries?.[0]?.series ?? [];
        this.forecastSeries.set(fs);

        this.growthTrend.set(d.growthTrend ?? []);
        this.saccoTable.set(d.saccoPerformance ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load analytics', 'Retry', { duration: 4000 })
          .onAction().subscribe(() => this.load());
        this.isLoading.set(false);
      }
    });
  }

  getBarWidth(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  // ── Donut segments ────────────────────────────────────────────────────
donutSegments = computed(() => {
  const total = this.breakdownTotal();
  if (total === 0) return [];
  const C = 2 * Math.PI * 40; // circumference r=40
  let offset = 0;
  return this.revenueBreakdown().map(r => {
    const pct   = r.value / total;
    const dash  = `${pct * C} ${C}`;
    const seg   = { color: r.color, dash, offset: -offset * C / total * C };
    offset += r.value;
    return { color: r.color, dash: `${pct * C} ${(1 - pct) * C}`,
             offset: -((offset - r.value) / total) * C };
  });
});

// ── Line chart SVG helpers ────────────────────────────────────────────
getX(i: number): number {
  const pts = this.growthTrend();
  return pts.length > 1 ? (i / (pts.length - 1)) * 580 + 10 : 10;
}

getY(value: number): number {
  const max = this.growthMax();
  return max > 0 ? 110 - ((value / max) * 100) : 110;
}

getLinePath(): string {
  const pts = this.growthTrend();
  if (pts.length === 0) return '';
  return pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${this.getX(i)},${this.getY(p.value)}`
  ).join(' ');
}

getAreaPath(): string {
  const pts = this.growthTrend();
  if (pts.length === 0) return '';
  const line = pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${this.getX(i)},${this.getY(p.value)}`
  ).join(' ');
  const last = pts.length - 1;
  return `${line} L${this.getX(last)},110 L${this.getX(0)},110 Z`;
}
}