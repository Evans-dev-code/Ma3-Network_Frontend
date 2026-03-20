import {
  Component, signal, computed, OnInit, OnDestroy, inject, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule }         from '@angular/common';
import { MatIconModule }        from '@angular/material/icon';
import { MatButtonModule }      from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule }     from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule }       from '@angular/material/badge';
import { Chart, ChartOptions, TooltipItem } from 'chart.js';
import 'chart.js/auto';
import { Subject, takeUntil } from 'rxjs';
import {
  OwnerService, AnalyticsDashboard, VehiclePerformance, DateRange
} from '../../../core/services/owner.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatTooltipModule, MatSnackBarModule, MatBadgeModule
  ],
  templateUrl: './analytics-dashboard.component.html',
  styleUrl:    './analytics-dashboard.component.scss'
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {

  private readonly ownerService = inject(OwnerService);
  private readonly snackBar     = inject(MatSnackBar);
  private readonly destroy$     = new Subject<void>();

  @ViewChild('trendCanvas')   trendCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseCanvas') expenseCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('maintCanvas')   maintCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('routeCanvas')   routeCanvas!:   ElementRef<HTMLCanvasElement>;

  private trendChart!:   Chart;
  private expenseChart!: Chart;
  private maintChart!:   Chart;
  private routeChart!:   Chart;

  // ── UI State ──────────────────────────────────────────────────────────
  isSubscriptionActive = signal(false);
  isLoading            = signal(false);
  isExporting          = signal(false);
  selectedRange        = signal<'week' | 'month'>('week');
  protected raw        = signal<AnalyticsDashboard | null>(null);

  // ── KPIs ──────────────────────────────────────────────────────────────
  totalVehicles        = computed(() => this.raw()?.totalVehicles        ?? 0);
  activeVehicles       = computed(() => this.raw()?.activeVehicles       ?? 0);
  totalTrips           = computed(() => this.raw()?.totalTrips           ?? 0);
  totalGrossRevenue    = computed(() => this.raw()?.totalGrossRevenue    ?? 0);
  totalNetProfit       = computed(() => this.raw()?.totalNetProfit       ?? 0);
  totalExpenses        = computed(() => this.raw()?.totalExpenses        ?? 0);
  totalFuelExpense     = computed(() => this.raw()?.totalFuelExpense     ?? 0);
  totalOtherExpenses   = computed(() => this.raw()?.totalOtherExpenses   ?? 0);
  totalMaintenanceCost = computed(() => this.raw()?.totalMaintenanceCost ?? 0);
  todayNetProfit       = computed(() => this.raw()?.todayNetProfit       ?? 0);

  profitMargin = computed(() => {
    const g = this.totalGrossRevenue();
    return g > 0 ? Math.round((this.totalNetProfit() / g) * 100) : 0;
  });
  expenseRatio = computed(() => {
    const g = this.totalGrossRevenue();
    return g > 0 ? Math.round((this.totalExpenses() / g) * 100) : 0;
  });
  avgRevenuePerTrip = computed(() => {
    const t = this.totalTrips();
    return t > 0 ? Math.round(this.totalGrossRevenue() / t) : 0;
  });
  avgProfitPerVehicle = computed(() => {
    const v = this.totalVehicles();
    return v > 0 ? Math.round(this.totalNetProfit() / v) : 0;
  });
  fleetUtilization = computed(() => {
    const t = this.totalVehicles();
    return t > 0 ? Math.round((this.activeVehicles() / t) * 100) : 0;
  });
  profitHealthLabel = computed(() => {
    const m = this.profitMargin();
    if (m >= 50) return { text: 'Excellent', color: '#10b981' };
    if (m >= 35) return { text: 'Healthy',   color: '#34d399' };
    if (m >= 20) return { text: 'Fair',       color: '#f59e0b' };
    return          { text: 'Critical',    color: '#f43f5e' };
  });

  vehiclePerformances = computed(() => this.raw()?.vehiclePerformances ?? []);
  maintenanceAlerts   = computed(() => this.raw()?.maintenanceAlerts   ?? []);
  complianceAlerts    = computed(() => this.raw()?.complianceAlerts    ?? []);
  totalAlerts         = computed(() =>
    this.maintenanceAlerts().length + this.complianceAlerts().length);

  topVehicle = computed(() => {
    const vp = this.vehiclePerformances();
    return vp.length
      ? vp.reduce((a, b) => a.todayNetProfit > b.todayNetProfit ? a : b)
      : null;
  });
  worstVehicle = computed(() => {
    const vp = this.vehiclePerformances();
    return vp.length
      ? vp.reduce((a, b) => a.targetAchievementPercent < b.targetAchievementPercent ? a : b)
      : null;
  });

  // ── Maintenance Modal ─────────────────────────────────────────────────
  maintModalOpen = signal(false);
  maintVehicle   = signal<VehiclePerformance | null>(null);
  maintLoading   = signal(false);

  readonly maintTypes = [
    { value: 'OIL_CHANGE',  label: 'Oil Change'  },
    { value: 'TYRES',       label: 'Tyres'        },
    { value: 'BRAKES',      label: 'Brakes'       },
    { value: 'ELECTRICAL',  label: 'Electrical'   },
    { value: 'ENGINE',      label: 'Engine'       },
    { value: 'BODY_WORK',   label: 'Body Work'    },
    { value: 'SUSPENSION',  label: 'Suspension'   },
    { value: 'OTHER',       label: 'Other'        }
  ];

  openMaintModal(v: VehiclePerformance): void {
    this.maintVehicle.set(v);
    this.maintModalOpen.set(true);
  }

  closeMaintModal(): void {
    this.maintModalOpen.set(false);
    this.maintVehicle.set(null);
  }

  submitMaintenance(event: Event): void {
    event.preventDefault();
    const form    = event.target as HTMLFormElement;
    const data    = new FormData(form);
    const vehicle = this.maintVehicle();
    if (!vehicle) return;

    const type    = data.get('maintenanceType') as string;
    const cost    = Number(data.get('cost'));
    const mileage = Number(data.get('mileage'));
    const desc    = data.get('description')  as string;
    const by      = data.get('performedBy')  as string;

    if (!type || !cost || !mileage) {
      this.snackBar.open('Type, cost and mileage are required', 'OK', { duration: 3000 });
      return;
    }

    this.maintLoading.set(true);
    this.ownerService.addMaintenanceRecord({
      vehicle:          { id: vehicle.vehicleId },
      maintenanceType:  type,
      description:      desc || '',
      mileageAtService: mileage,
      cost,
      performedBy:      by   || ''
    }).subscribe({
      next: () => {
        this.snackBar.open(
          `✓ Maintenance logged for ${vehicle.plateNumber}`, '', { duration: 3000 });
        this.maintLoading.set(false);
        form.reset();
        this.closeMaintModal();
        this.loadData();
      },
      error: () => {
        this.snackBar.open('Failed to save. Try again.', 'OK', { duration: 3000 });
        this.maintLoading.set(false);
      }
    });
  }

  // ── Chart shared config ───────────────────────────────────────────────
  private readonly gc = 'rgba(255,255,255,0.04)';
  private readonly tc = '#475569';
  private readonly tt = {
    backgroundColor: '#0f172a', titleColor: '#f1f5f9',
    bodyColor: '#94a3b8', borderColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1, padding: 14, cornerRadius: 8,
    displayColors: true, boxPadding: 4
  };
  private readonly leg = {
    position: 'bottom' as const,
    labels: { color: '#64748b', font: { size: 11 }, boxWidth: 10, padding: 20 }
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.checkSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.trendChart?.destroy();
    this.expenseChart?.destroy();
    this.maintChart?.destroy();
    this.routeChart?.destroy();
  }

  // ── Subscription ──────────────────────────────────────────────────────
  /**
   * Called on init — checks the real DB subscription state.
   * If active, loads dashboard data immediately.
   * If not active, shows the paywall.
   */
  private checkSubscription(): void {
    this.isLoading.set(true);
    this.ownerService.getSubscriptionStatus().subscribe({
      next: (s) => {
        this.isSubscriptionActive.set(s.active);
        this.isLoading.set(false);
        if (s.active) this.loadData();
      },
      error: () => {
        // If the endpoint fails for any reason, default to showing the paywall
        this.isSubscriptionActive.set(false);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Called when owner clicks "Unlock via M-Pesa".
   * The setTimeout simulates the STK push round-trip delay.
   * In production: trigger Daraja STK push first, then call activateSubscription()
   * inside the Daraja callback/webhook once payment is confirmed.
   */
  unlockDashboard(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.ownerService.activateSubscription().subscribe({
        next: (s) => {
          this.isSubscriptionActive.set(s.active);
          this.isLoading.set(false);
          if (s.active) {
            this.snackBar.open(
              '✓ Subscription activated! Welcome to Wealth Protector.',
              'Close', { duration: 4000 });
            this.loadData();
          } else {
            this.snackBar.open(
              'Activation failed. Please try again.', 'OK', { duration: 3000 });
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.snackBar.open(
            'Payment failed. Please try again.', 'OK', { duration: 3000 });
        }
      });
    }, 2500);
  }

  // ── Data Loading ──────────────────────────────────────────────────────
  loadData(range?: DateRange): void {
    this.isLoading.set(true);
    this.ownerService.getAnalytics(range)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.raw.set(data);
          this.isLoading.set(false);
          setTimeout(() => this.buildCharts(data), 300);
        },
        error: () => {
          this.snackBar.open('Failed to load dashboard', 'Retry', { duration: 4000 })
            .onAction().subscribe(() => this.loadData(range));
          this.isLoading.set(false);
        }
      });
  }

  private buildCharts(d: AnalyticsDashboard): void {
    this.buildTrend(d);
    this.buildExpense(d);
    this.buildMaint(d);
    this.buildRoute(d);
  }

  // ── Trend Line ────────────────────────────────────────────────────────
  private buildTrend(data: AnalyticsDashboard): void {
    const el = this.trendCanvas?.nativeElement;
    if (!el) return;

    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const rm = new Map<string,number>(), pm = new Map<string,number>();
    (data.weeklyTrend ?? []).forEach(s =>
      (s.series ?? []).forEach((p: { name: string; value: number }) => {
        if (s.name === 'Gross Revenue') rm.set(p.name, Number(p.value));
        if (s.name === 'Net Profit')    pm.set(p.name, Number(p.value));
      })
    );
    const rd = days.map(d => rm.get(d) ?? 0);
    const pd = days.map(d => pm.get(d) ?? 0);

    if (this.trendChart) {
      this.trendChart.data.datasets[0].data = rd;
      this.trendChart.data.datasets[1].data = pd;
      this.trendChart.update(); return;
    }

    this.trendChart = new Chart(el, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Gross Revenue', data: rd,
            borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)',
            fill: true, tension: 0.4, pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#10b981', pointBorderColor: '#0f172a',
            pointBorderWidth: 2, borderWidth: 2.5
          },
          {
            label: 'Net Profit', data: pd,
            borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.06)',
            fill: true, tension: 0.4, pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#3b82f6', pointBorderColor: '#0f172a',
            pointBorderWidth: 2, borderWidth: 2.5
          }
        ]
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: this.leg,
          tooltip: { ...this.tt, callbacks: {
            label: (c: TooltipItem<'line'>) =>
              ` ${c.dataset.label}: KSh ${Number(c.parsed.y).toLocaleString()}`
          }}
        },
        scales: {
          x: { ticks: { color: this.tc, font: { size: 11 } }, grid: { color: this.gc } },
          y: { ticks: { color: this.tc, font: { size: 11 },
                 callback: (v: string|number) => 'KSh ' + Number(v).toLocaleString() },
               grid: { color: this.gc } }
        }
      } as ChartOptions<'line'>
    });
  }

  // ── Expense Donut ─────────────────────────────────────────────────────
  private buildExpense(data: AnalyticsDashboard): void {
    const el = this.expenseCanvas?.nativeElement;
    if (!el) return;

    const vals = [
      Number(data.totalFuelExpense     ?? 0),
      Number(data.totalOtherExpenses   ?? 0),
      Number(data.totalMaintenanceCost ?? 0)
    ];

    if (this.expenseChart) {
      this.expenseChart.data.datasets[0].data = vals;
      this.expenseChart.update(); return;
    }

    this.expenseChart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['Fuel', 'Operational', 'Maintenance'],
        datasets: [{
          data: vals,
          backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6'],
          borderWidth: 3, borderColor: '#0f172a', hoverOffset: 8
        }]
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: this.leg,
          tooltip: { ...this.tt, callbacks: {
            label: (c: TooltipItem<'doughnut'>) => {
              const total = vals.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? Math.round((Number(c.parsed) / total) * 100) : 0;
              return ` KSh ${Number(c.parsed).toLocaleString()} (${pct}%)`;
            }
          }}
        }
      } as ChartOptions<'doughnut'>
    });
  }

  // ── Maintenance Donut ─────────────────────────────────────────────────
  private buildMaint(data: AnalyticsDashboard): void {
    const el = this.maintCanvas?.nativeElement;
    if (!el) return;

    const labels = (data.maintenanceCostByType ?? []).map((c: { name: string })  => c.name);
    const vals   = (data.maintenanceCostByType ?? []).map((c: { value: number }) => Number(c.value));

    if (this.maintChart) {
      this.maintChart.data.labels = labels;
      this.maintChart.data.datasets[0].data = vals;
      this.maintChart.update(); return;
    }

    this.maintChart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: vals,
          backgroundColor: [
            '#10b981','#f59e0b','#ef4444',
            '#6366f1','#8b5cf6','#ec4899','#06b6d4'
          ],
          borderWidth: 3, borderColor: '#0f172a', hoverOffset: 8
        }]
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: this.leg,
          tooltip: { ...this.tt, callbacks: {
            label: (c: TooltipItem<'doughnut'>) =>
              ` KSh ${Number(c.parsed).toLocaleString()}`
          }}
        }
      } as ChartOptions<'doughnut'>
    });
  }

  // ── Route Bar ─────────────────────────────────────────────────────────
  private buildRoute(data: AnalyticsDashboard): void {
    const el = this.routeCanvas?.nativeElement;
    if (!el) return;

    const labels = (data.routePerformance ?? []).map((r: { name: string })  => r.name);
    const vals   = (data.routePerformance ?? []).map((r: { value: number }) => Number(r.value));

    if (this.routeChart) {
      this.routeChart.data.labels = labels;
      this.routeChart.data.datasets[0].data = vals;
      this.routeChart.update(); return;
    }

    this.routeChart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Net Profit', data: vals,
          backgroundColor: vals.map((_, i) =>
            i === 0 ? 'rgba(16,185,129,0.9)' : 'rgba(16,185,129,0.45)'),
          borderRadius: 6, borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { ...this.tt, callbacks: {
            label: (c: TooltipItem<'bar'>) =>
              ` KSh ${Number(c.parsed.x).toLocaleString()}`
          }}
        },
        scales: {
          x: {
            ticks: { color: this.tc, font: { size: 11 },
              callback: (v: string|number) => 'KSh ' + Number(v).toLocaleString() },
            grid: { color: this.gc }
          },
          y: {
            ticks: { color: this.tc, font: { size: 11 } },
            grid:  { color: 'transparent' }
          }
        }
      } as ChartOptions<'bar'>
    });
  }

  // ── Range change ──────────────────────────────────────────────────────
  onRangeChange(range: 'week' | 'month'): void {
    this.selectedRange.set(range);
    const now = new Date(), from = new Date(now);
    if (range === 'week') {
      from.setDate(now.getDate() - (now.getDay() || 7) + 1);
      from.setHours(0, 0, 0, 0);
    } else {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    }
    this.loadData({
      from: from.toISOString().slice(0, 19),
      to:   now.toISOString().slice(0, 19)
    });
  }

  // ── Target update ─────────────────────────────────────────────────────
  updateTarget(v: VehiclePerformance): void {
    const input = window.prompt(
      `Daily target for ${v.plateNumber} (KSh):`, String(v.dailyTarget));
    if (!input) return;
    const target = parseFloat(input.replace(/,/g, ''));
    if (isNaN(target) || target <= 0) {
      this.snackBar.open('Enter a valid amount', 'OK', { duration: 3000 }); return;
    }
    this.ownerService.updateDailyTarget(v.vehicleId, target).subscribe({
      next: () => {
        this.snackBar.open(
          `✓ Target → KSh ${target.toLocaleString()}`, '', { duration: 3000 });
        this.loadData();
      },
      error: () => this.snackBar.open('Update failed', 'OK', { duration: 3000 })
    });
  }

  // ── PDF Export ────────────────────────────────────────────────────────
  exportToPdf(): void {
    this.isExporting.set(true);
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) {
      this.snackBar.open('Allow popups to export PDF', 'OK', { duration: 4000 });
      this.isExporting.set(false); return;
    }
    win.document.write(this.buildPdf());
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); this.isExporting.set(false); }, 900);
  }

  private buildPdf(): string {
    const d     = this.raw();
    const today = new Date().toLocaleDateString('en-KE', { dateStyle: 'long' });
    const range = this.selectedRange() === 'week' ? 'This Week' : 'This Month';

    const vRows = this.vehiclePerformances().map(v => `
      <tr>
        <td><strong>${v.plateNumber}</strong></td><td>${v.route}</td>
        <td class="${v.status === 'ACTIVE' ? 'g' : 'x'}">${v.status}</td>
        <td>KSh ${Number(v.dailyTarget).toLocaleString()}</td>
        <td class="g">KSh ${Number(v.todayNetProfit).toLocaleString()}</td>
        <td class="${v.targetAchievementPercent >= 80 ? 'g'
                   : v.targetAchievementPercent >= 50 ? 'a' : 'r'}">
          ${v.targetAchievementPercent.toFixed(1)}%</td>
        <td class="${v.serviceDue ? 'r' : 'g'}">${v.serviceDue ? '⚠ Due' : '✓ OK'}</td>
        <td class="${v.complianceExpiringSoon ? 'r' : 'g'}">
          ${v.complianceExpiringSoon ? '⚠ Check' : '✓ Valid'}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Ma3 Network Fleet Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:48px 56px;font-size:13px}
.hdr{display:flex;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #10b981;margin-bottom:32px}
.brand h1{font-size:22px;font-weight:800}.brand p{color:#64748b;font-size:12px;margin-top:4px}
.meta{text-align:right;color:#64748b;font-size:12px;line-height:1.8}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
.kpi{background:#f8fafc;border-radius:8px;padding:14px 16px;border-left:4px solid #10b981}
.kpi.r{border-color:#ef4444}.kpi.b{border-color:#3b82f6}.kpi.a{border-color:#f59e0b}.kpi.p{border-color:#8b5cf6}
.kl{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600}
.kv{font-size:20px;font-weight:800;color:#0f172a;margin-top:6px}
h2{font-size:13px;font-weight:700;margin:28px 0 10px;text-transform:uppercase;
   padding-bottom:6px;border-bottom:1px solid #e2e8f0}
table{width:100%;border-collapse:collapse;font-size:12px}
thead tr{background:#0f172a;color:#fff}
thead th{padding:9px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase}
tbody tr:nth-child(even){background:#f8fafc}
tbody td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
.g{color:#059669;font-weight:600}.a{color:#d97706;font-weight:600}
.r{color:#dc2626;font-weight:600}.x{color:#6b7280}
.ftr{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;
     display:flex;justify-content:space-between;color:#94a3b8;font-size:11px}
@media print{body{padding:24px 32px}@page{margin:1.2cm}}
</style></head><body>
<div class="hdr">
  <div class="brand"><h1>🚌 Ma3 Network</h1><p>Wealth Protector Fleet Report</p></div>
  <div class="meta">
    <div>${today}</div><div>${range}</div>
    <div>${d?.totalVehicles ?? 0} vehicles · ${d?.activeVehicles ?? 0} active</div>
  </div>
</div>
<div class="grid">
  <div class="kpi"><div class="kl">Gross Revenue</div>
    <div class="kv">KSh ${Number(d?.totalGrossRevenue ?? 0).toLocaleString()}</div></div>
  <div class="kpi"><div class="kl">Net Profit</div>
    <div class="kv">KSh ${Number(d?.totalNetProfit ?? 0).toLocaleString()}</div></div>
  <div class="kpi r"><div class="kl">Total Expenses</div>
    <div class="kv">KSh ${Number(d?.totalExpenses ?? 0).toLocaleString()}</div></div>
  <div class="kpi b"><div class="kl">Profit Margin</div>
    <div class="kv">${this.profitMargin()}%</div></div>
  <div class="kpi a"><div class="kl">Total Trips</div>
    <div class="kv">${Number(d?.totalTrips ?? 0).toLocaleString()}</div></div>
  <div class="kpi"><div class="kl">Today Profit</div>
    <div class="kv">KSh ${Number(d?.todayNetProfit ?? 0).toLocaleString()}</div></div>
  <div class="kpi r"><div class="kl">Fuel Spend</div>
    <div class="kv">KSh ${Number(d?.totalFuelExpense ?? 0).toLocaleString()}</div></div>
  <div class="kpi p"><div class="kl">Maintenance</div>
    <div class="kv">KSh ${Number(d?.totalMaintenanceCost ?? 0).toLocaleString()}</div></div>
</div>
<h2>Fleet Performance</h2>
<table>
  <thead>
    <tr>
      <th>Plate</th><th>Route</th><th>Status</th><th>Daily Target</th>
      <th>Today Profit</th><th>Target %</th><th>Service</th><th>Compliance</th>
    </tr>
  </thead>
  <tbody>
    ${vRows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px">No data</td></tr>'}
  </tbody>
</table>
<div class="ftr">
  <span>Ma3 Network — Wealth Protector Pro</span>
  <span>Confidential</span>
  <span>${today}</span>
</div>
</body></html>`;
  }

  // ── Ring / Color helpers ──────────────────────────────────────────────
  readonly RING_C = 2 * Math.PI * 46;

  getRingOffset(pct: number): number {
    return this.RING_C - Math.min(pct, 100) / 100 * this.RING_C;
  }

  getRingColor(pct: number): string {
    if (pct >= 100) return '#10b981';
    if (pct >= 70)  return '#f59e0b';
    if (pct >= 40)  return '#6366f1';
    return '#ef4444';
  }

  getServiceColor(pct: number): string {
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    return '#10b981';
  }

  getDaysUntil(d: string): number {
    if (!d) return 999;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  }

  trackByVehicle = (_: number, v: VehiclePerformance): number => v.vehicleId;
}