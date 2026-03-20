import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule }   from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SaccoService } from '../../../core/services/sacco.service';

export interface ComplianceRecord {
  id:              number;
  plateNumber:     string;
  route:           string;
  ownerName:       string;
  ownerEmail:      string;
  ntsaExpiry:      Date;
  insuranceExpiry: Date;
  tlbExpiry:       Date;
}

type FilterType = 'all' | 'expiring' | 'expired';

@Component({
  selector: 'app-compliance-tracker',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './compliance-tracker.component.html',
  styleUrl:    './compliance-tracker.component.scss'
})
export class ComplianceTrackerComponent implements OnInit {

  private saccoService = inject(SaccoService);
  private snackBar     = inject(MatSnackBar);

  isLoading   = signal(true);
  fleetData   = signal<ComplianceRecord[]>([]);
  activeFilter = signal<FilterType>('all');
  searchQuery  = signal('');

  readonly today           = new Date();
  readonly thirtyDaysLater = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + 30);

  // ── KPIs ──────────────────────────────────────────────────────────
  totalFleet = computed(() => this.fleetData().length);

  expiredCount = computed(() =>
    this.fleetData().filter(v =>
      v.ntsaExpiry      < this.today ||
      v.insuranceExpiry < this.today ||
      v.tlbExpiry       < this.today
    ).length
  );

  expiringCount = computed(() =>
    this.fleetData().filter(v => {
      const soon = this.thirtyDaysLater;
      const anyExpiring =
        (v.ntsaExpiry      >= this.today && v.ntsaExpiry      <= soon) ||
        (v.insuranceExpiry >= this.today && v.insuranceExpiry <= soon) ||
        (v.tlbExpiry       >= this.today && v.tlbExpiry       <= soon);
      const anyExpired =
        v.ntsaExpiry      < this.today ||
        v.insuranceExpiry < this.today ||
        v.tlbExpiry       < this.today;
      return anyExpiring && !anyExpired;
    }).length
  );

  compliantCount = computed(() =>
    this.totalFleet() - this.expiredCount() - this.expiringCount()
  );

  complianceRate = computed(() => {
    const t = this.totalFleet();
    return t > 0 ? Math.round((this.compliantCount() / t) * 100) : 0;
  });

  // ── Filtered list ─────────────────────────────────────────────────
  filteredFleet = computed(() => {
    let data = this.fleetData();
    const q  = this.searchQuery().toLowerCase();

    if (q) {
      data = data.filter(v =>
        v.plateNumber.toLowerCase().includes(q) ||
        v.ownerName.toLowerCase().includes(q)   ||
        v.route.toLowerCase().includes(q)
      );
    }

    switch (this.activeFilter()) {
      case 'expired':
        return data.filter(v =>
          v.ntsaExpiry      < this.today ||
          v.insuranceExpiry < this.today ||
          v.tlbExpiry       < this.today
        );
      case 'expiring':
        return data.filter(v => {
          const s = this.thirtyDaysLater;
          return (
            (v.ntsaExpiry      >= this.today && v.ntsaExpiry      <= s) ||
            (v.insuranceExpiry >= this.today && v.insuranceExpiry <= s) ||
            (v.tlbExpiry       >= this.today && v.tlbExpiry       <= s)
          );
        });
      default:
        return data;
    }
  });

  ngOnInit(): void {
    this.loadFleet();
  }

  private loadFleet(): void {
    this.isLoading.set(true);
    this.saccoService.getFleet().subscribe({
      next: (data) => {
        const mapped: ComplianceRecord[] = data.map((v: any) => ({
          id:              v.id,
          plateNumber:     v.plateNumber,
          route:           v.route ?? 'Unassigned',
          ownerName:       v.owner
            ? `${v.owner.firstName} ${v.owner.lastName}`
            : 'No owner',
          ownerEmail:      v.owner?.email ?? '',
          ntsaExpiry:      new Date(v.ntsaExpiry),
          insuranceExpiry: new Date(v.insuranceExpiry),
          tlbExpiry:       new Date(v.tlbExpiry)
        }));
        this.fleetData.set(mapped);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load fleet data', 'Retry', { duration: 4000 })
          .onAction().subscribe(() => this.loadFleet());
        this.isLoading.set(false);
      }
    });
  }

  setFilter(f: FilterType): void { this.activeFilter.set(f); }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  getStatus(date: Date): 'valid' | 'expiring' | 'expired' {
    if (date < this.today) return 'expired';
    if (date <= this.thirtyDaysLater) return 'expiring';
    return 'valid';
  }

  getDaysLeft(date: Date): number {
    return Math.ceil((date.getTime() - this.today.getTime()) / 86_400_000);
  }

  getWorstStatus(v: ComplianceRecord): 'valid' | 'expiring' | 'expired' {
    const statuses = [
      this.getStatus(v.ntsaExpiry),
      this.getStatus(v.insuranceExpiry),
      this.getStatus(v.tlbExpiry)
    ];
    if (statuses.includes('expired'))  return 'expired';
    if (statuses.includes('expiring')) return 'expiring';
    return 'valid';
  }

  sendReminder(v: ComplianceRecord): void {
    this.snackBar.open(
      `✓ Reminder sent to ${v.ownerEmail || v.ownerName}`, 'Close', { duration: 3000 });
  }
}