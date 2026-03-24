import {
  Component, OnInit, OnDestroy, signal, inject, computed, Inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { MatIconModule }   from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatButtonModule }    from '@angular/material/button';
import { LeafletModule }      from '@bluehalo/ngx-leaflet';
import * as L from 'leaflet';
import { SaccoService } from '../../../core/services/sacco.service';
import { WebsocketService } from '../../../core/services/websocket.service';
import { Subscription } from 'rxjs';

// ── Leaflet icon fix ───────────────────────────────────────────────────
L.Marker.prototype.options.icon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41], iconAnchor: [12,41],
  popupAnchor: [1,-34], shadowSize: [41,41]
});

// ── Validator: driver & conductor emails must differ when both present ─
const crewEmailsValidator = (g: AbstractControl): ValidationErrors | null => {
  const d = g.get('driverEmail')?.value?.trim().toLowerCase();
  const c = g.get('conductorEmail')?.value?.trim().toLowerCase();
  return (d && c && d === c) ? { sameEmail: true } : null;
};

// ══════════════════════════════════════════════════════════════════════
// REASSIGN CREW DIALOG — conductor is optional
// ══════════════════════════════════════════════════════════════════════
@Component({
  selector: 'app-assign-crew-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <div class="dlg-wrapper">

      <div class="dlg-header">
        <div class="dlg-title-block">
          <div class="dlg-bus-icon"><mat-icon>directions_bus</mat-icon></div>
          <div>
            <h2>Reassign Crew</h2>
            <p>{{ data.plateNumber }} · {{ data.route }}</p>
          </div>
        </div>
        <button class="dlg-close" mat-dialog-close><mat-icon>close</mat-icon></button>
      </div>

      <div class="dlg-body">

        <div class="dlg-error" *ngIf="form.hasError('sameEmail')">
          <mat-icon>warning</mat-icon>
          Driver and conductor cannot share the same email address.
        </div>

        <form [formGroup]="form">

          <div class="current-crew" *ngIf="data.currentDriver || data.currentConductor">
            <span class="cc-label">Current crew</span>
            <div class="cc-row">
              <div class="cc-person" *ngIf="data.currentDriver">
                <mat-icon>directions_car</mat-icon>{{ data.currentDriver }}
              </div>
              <div class="cc-person" *ngIf="data.currentConductor">
                <mat-icon>person</mat-icon>{{ data.currentConductor }}
              </div>
              <div class="cc-person missing" *ngIf="!data.currentConductor">
                <mat-icon>person_off</mat-icon>No conductor assigned
              </div>
            </div>
          </div>

          <div class="dlg-section-header">
            <div class="dlg-section-icon driver"><mat-icon>directions_car</mat-icon></div>
            <div>
              <span class="dlg-section-title">
                Driver <span class="badge-required">Required</span>
              </span>
              <span class="dlg-section-sub">Starts trips and logs expenses</span>
            </div>
          </div>

          <div class="dlg-grid">
            <mat-form-field appearance="outline">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="driverFirstName">
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="driverLastName">
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="driverEmail">
              <mat-error *ngIf="form.get('driverEmail')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="form.get('driverEmail')?.hasError('email')">Invalid email</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="driverPhone" placeholder="07...">
              <mat-error *ngIf="form.get('driverPhone')?.hasError('pattern')">
                Must be 10–12 digits
              </mat-error>
            </mat-form-field>
          </div>

          <div class="dlg-section-header">
            <div class="dlg-section-icon conductor"><mat-icon>person</mat-icon></div>
            <div>
              <span class="dlg-section-title">
                Conductor <span class="badge-optional">Optional</span>
              </span>
              <span class="dlg-section-sub">
                Leave blank to keep vehicle without a conductor
              </span>
            </div>
          </div>

          <div class="dlg-grid">
            <mat-form-field appearance="outline">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="conductorFirstName" placeholder="Optional">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="conductorLastName" placeholder="Optional">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="conductorEmail"
                     placeholder="Optional">
              <mat-error *ngIf="form.get('conductorEmail')?.hasError('email')">
                Invalid email
              </mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="conductorPhone" placeholder="Optional">
              <mat-error *ngIf="form.get('conductorPhone')?.hasError('pattern')">
                Must be 10–12 digits
              </mat-error>
            </mat-form-field>
          </div>

        </form>
      </div>

      <div class="dlg-footer">
        <button class="dlg-cancel-btn" mat-dialog-close>Cancel</button>
        <button class="dlg-submit-btn"
                [disabled]="form.invalid || form.hasError('sameEmail')"
                (click)="onSubmit()">
          <mat-icon>group_add</mat-icon>
          Assign Crew
        </button>
      </div>

    </div>
  `,
  styles: [`
    .dlg-wrapper {
      background: #ffffff; border-radius: 16px; overflow: hidden;
      font-family: 'DM Sans','Segoe UI',sans-serif;
    }
    .dlg-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 22px 16px; border-bottom: 1px solid #e2e8f0;
    }
    .dlg-title-block {
      display: flex; align-items: center; gap: 12px;
      h2 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; }
      p  { margin: 2px 0 0; font-size: .75rem; color: #64748b; }
    }
    .dlg-bus-icon {
      width: 36px; height: 36px; border-radius: 9px;
      background: rgba(59,130,246,.1);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; color: #3b82f6 !important; }
    }
    .dlg-close {
      background: transparent; border: 1px solid #e2e8f0; border-radius: 7px;
      width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s;
      &:hover { background: #f1f5f9; }
      mat-icon { font-size: 16px; color: #64748b !important; }
    }
    .dlg-body {
      padding: 16px 22px; max-height: 65vh; overflow-y: auto;
    }
    .dlg-error {
      display: flex; align-items: center; gap: 8px;
      background: #fff1f2; border-left: 4px solid #f43f5e; color: #be123c;
      padding: 10px 12px; border-radius: 6px; margin-bottom: 14px;
      font-size: .82rem; font-weight: 500;
      mat-icon { font-size: 17px; height: 17px; width: 17px; color: #f43f5e !important; }
    }
    .current-crew {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 10px 12px; margin-bottom: 14px;
      .cc-label {
        font-size: .62rem; text-transform: uppercase; letter-spacing: .06em;
        color: #94a3b8; font-weight: 700;
      }
      .cc-row { display: flex; gap: 16px; margin-top: 6px; flex-wrap: wrap; }
      .cc-person {
        display: flex; align-items: center; gap: 5px;
        font-size: .78rem; font-weight: 600; color: #475569;
        mat-icon { font-size: 14px; height: 14px; width: 14px; color: #94a3b8 !important; }
        &.missing { color: #f59e0b;
          mat-icon { color: #f59e0b !important; } }
      }
    }
    .dlg-section-header {
      display: flex; align-items: center; gap: 10px; margin: 16px 0 10px;
    }
    .dlg-section-icon {
      width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 15px; }
      &.driver    { background: rgba(59,130,246,.1);  mat-icon { color: #3b82f6 !important; } }
      &.conductor { background: rgba(139,92,246,.1);  mat-icon { color: #8b5cf6 !important; } }
    }
    .dlg-section-title {
      display: block; font-size: .84rem; font-weight: 700; color: #0f172a;
    }
    .dlg-section-sub {
      display: block; font-size: .68rem; color: #64748b;
    }
    .badge-required {
      font-size: .58rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; color: #fff; background: #3b82f6;
      padding: 1px 7px; border-radius: 10px; margin-left: 6px; vertical-align: middle;
    }
    .badge-optional {
      font-size: .58rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; color: #64748b; background: #f1f5f9;
      border: 1px solid #e2e8f0; padding: 1px 7px; border-radius: 10px;
      margin-left: 6px; vertical-align: middle;
    }
    .dlg-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    }
    .dlg-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 14px 22px; border-top: 1px solid #e2e8f0;
    }
    .dlg-cancel-btn {
      background: transparent; border: 1px solid #e2e8f0; padding: 8px 18px;
      border-radius: 8px; font-size: .82rem; font-weight: 600; color: #64748b;
      cursor: pointer; transition: all .15s;
      &:hover { border-color: #cbd5e1; color: #0f172a; }
    }
    .dlg-submit-btn {
      display: flex; align-items: center; gap: 6px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff; border: none; padding: 8px 18px;
      border-radius: 8px; font-size: .82rem; font-weight: 700; cursor: pointer;
      transition: opacity .2s, transform .15s;
      &:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
      &:disabled { opacity: .45; cursor: not-allowed; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #fff !important; }
    }
  `]
})
export class AssignCrewDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AssignCrewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      vehicleId:         number;
      plateNumber:       string;
      route:             string;
      currentDriver?:    string;
      currentConductor?: string;
    }
  ) {
    this.form = this.fb.group({
      // Driver — required
      driverFirstName: ['', Validators.required],
      driverLastName:  ['', Validators.required],
      driverEmail:     ['', [Validators.required, Validators.email]],
      driverPhone:     ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],

      // Conductor — optional
      conductorFirstName: [''],
      conductorLastName:  [''],
      conductorEmail:     ['', Validators.email],
      conductorPhone:     ['', Validators.pattern('^$|^[0-9]{10,12}$')]
    }, { validators: crewEmailsValidator });
  }

  onSubmit(): void {
    if (this.form.invalid || this.form.hasError('sameEmail')) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;

    // Only include conductor fields when email was entered
    const conductorBlock = v.conductorEmail?.trim()
      ? {
          conductorFirstName: v.conductorFirstName,
          conductorLastName:  v.conductorLastName,
          conductorEmail:     v.conductorEmail,
          conductorPhone:     v.conductorPhone
        }
      : {};

    this.dialogRef.close({
      driverFirstName: v.driverFirstName,
      driverLastName:  v.driverLastName,
      driverEmail:     v.driverEmail,
      driverPhone:     v.driverPhone,
      ...conductorBlock
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export interface DispatchVehicle {
  id:            number;
  plateNumber:   string;
  route:         string;
  status:        string;
  driverName:    string;
  conductorName: string;
  ownerName:     string;
  hasConductor:  boolean;
  speed:         number;
  lat:           number;
  lng:           number;
}

@Component({
  selector: 'app-fleet-dispatch',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatSnackBarModule,
    MatDialogModule, LeafletModule
  ],
  templateUrl: './fleet-dispatch.component.html',
  styleUrl:    './fleet-dispatch.component.scss'
})
export class FleetDispatchComponent implements OnInit, OnDestroy {

  private saccoService = inject(SaccoService);
  private snackBar     = inject(MatSnackBar);
  private dialog       = inject(MatDialog);
  private wsService    = inject(WebsocketService); 

  isLoading   = signal(true);
  vehicles    = signal<DispatchVehicle[]>([]);
  selectedId  = signal<number | null>(null);
  searchQuery = signal('');

  private map?: L.Map;
  private wsSubscription?: Subscription;

  // ── KPIs ──────────────────────────────────────────────────────────
  activeCount = computed(() =>
    this.vehicles().filter(v => v.status === 'ACTIVE').length);

  inactiveCount = computed(() =>
    this.vehicles().filter(v => v.status !== 'ACTIVE').length);

  // No crew = no driver OR no conductor
  noCrewCount = computed(() =>
    this.vehicles().filter(v =>
      v.driverName === 'No Driver' || !v.hasConductor
    ).length);

  utilizationRate = computed(() => {
    const t = this.vehicles().length;
    return t > 0 ? Math.round((this.activeCount() / t) * 100) : 0;
  });

  filteredVehicles = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.vehicles();
    return this.vehicles().filter(v =>
      v.plateNumber.toLowerCase().includes(q)  ||
      v.route.toLowerCase().includes(q)        ||
      v.driverName.toLowerCase().includes(q)   ||
      v.conductorName.toLowerCase().includes(q)
    );
  });

  selectedVehicle = computed(() =>
    this.vehicles().find(v => v.id === this.selectedId()) ?? null);

  // ── Map ────────────────────────────────────────────────────────────
  mapOptions: L.MapOptions = {
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap'
      })
    ],
    zoom: 12,
    center: L.latLng(-1.2921, 36.8219)
  };

  mapLayers = signal<L.Layer[]>([]);

  ngOnInit():    void { this.loadFleet(); }
  
  ngOnDestroy(): void { 
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    this.vehicles().forEach(v => this.wsService.stopTracking(v.id));
  }

  loadFleet(): void {
    this.isLoading.set(true);
    this.saccoService.getFleet().subscribe({
      next: (data) => {
        const mapped: DispatchVehicle[] = data.map((v: any, i: number) => ({
          id:           v.id,
          plateNumber:  v.plateNumber,
          route:        v.route ?? 'Unassigned',
          status:       v.status,
          driverName:   v.driver ? `${v.driver.firstName} ${v.driver.lastName}` : 'No Driver',
          conductorName: v.conductor ? `${v.conductor.firstName} ${v.conductor.lastName}` : 'No Conductor',
          ownerName: v.owner ? `${v.owner.firstName} ${v.owner.lastName}` : 'No Owner',
          hasConductor: !!v.conductor,
          speed: 0,
          lat: -1.2921 + (i * 0.012) - 0.03,
          lng:  36.8219 + (i * 0.015) - 0.03
        }));
        this.vehicles.set(mapped);
        this.updateMarkers();
        this.isLoading.set(false);

        // WebSockets Integration
        mapped.forEach(v => this.wsService.trackVehicle(v.id));
        
        this.wsSubscription = this.wsService.getLocationFeed().subscribe(update => {
          const current = this.vehicles();
          const vIndex = current.findIndex(v => v.id === update.vehicleId);
          if (vIndex !== -1) {
            const updatedFleet = [...current];
            updatedFleet[vIndex] = {
              ...updatedFleet[vIndex],
              lat: update.lat,
              lng: update.lng,
              speed: Math.floor(Math.random() * (60 - 30 + 1) + 30) // Visual speed simulation
            };
            this.vehicles.set(updatedFleet);
            this.updateMarkers();
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to load fleet', 'Retry', { duration: 4000 })
          .onAction().subscribe(() => this.loadFleet());
        this.isLoading.set(false);
      }
    });
  }

  onMapReady(map: L.Map): void {
    this.map = map;
    setTimeout(() => map.invalidateSize(), 150);
  }

  selectVehicle(v: DispatchVehicle): void {
    this.selectedId.set(v.id);
    if (this.map) this.map.flyTo([v.lat, v.lng], 14, { duration: 1 });
    this.updateMarkers();
  }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  private updateMarkers(): void {
    const layers = this.vehicles().map(v => {
      const active   = v.status === 'ACTIVE';
      const selected = v.id === this.selectedId();
      const color    = v.speed > 0 ? '#10b981' : '#f43f5e';
      const size     = selected ? 16 : 11;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px; height:${size}px; border-radius:50%;
          background:${color}; border:2px solid ${selected ? '#fff' : 'rgba(255,255,255,.6)'};
          box-shadow:0 0 0 ${selected ? '5' : '2'}px ${color}44;
          transition:all .3s;
        "></div>`,
        iconSize: [size, size], iconAnchor: [size/2, size/2]
      });

      return L.marker([v.lat, v.lng], { icon }).bindPopup(`
        <div style="font-family:'Segoe UI',sans-serif;min-width:170px;padding:4px">
          <div style="font-size:.95rem;font-weight:800;color:#0f172a">${v.plateNumber}</div>
          <div style="color:#64748b;font-size:.78rem;margin-bottom:8px">${v.route}</div>
          <div style="display:flex;flex-direction:column;gap:4px;font-size:.78rem">
            <div style="display:flex;justify-content:space-between">
              <span style="color:#94a3b8">Status</span>
              <strong style="color:${color}">${v.status}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:#94a3b8">Speed</span>
              <strong style="color:${color}">${v.speed} km/h</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:#94a3b8">Driver</span>
              <strong style="color:#0f172a">${v.driverName}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:#94a3b8">Conductor</span>
              <strong style="color:${v.hasConductor ? '#0f172a' : '#f59e0b'}">
                ${v.conductorName}
              </strong>
            </div>
          </div>
        </div>
      `);
    });
    this.mapLayers.set(layers);
  }

  // ── Actions ────────────────────────────────────────────────────────
  reassignCrew(v: DispatchVehicle): void {
    const ref = this.dialog.open(AssignCrewDialogComponent, {
      width:        '600px',
      maxWidth:     '95vw',
      disableClose: true,
      data: {
        vehicleId:        v.id,
        plateNumber:      v.plateNumber,
        route:            v.route,
        currentDriver:    v.driverName    !== 'No Driver'    ? v.driverName    : null,
        currentConductor: v.hasConductor                     ? v.conductorName : null
      }
    });

    ref.afterClosed().subscribe(formData => {
      if (!formData) return;
      this.saccoService.reassignCrew(v.id, formData).subscribe({
        next: (msg) => {
          this.snackBar.open(`✓ ${msg}`, 'Close', { duration: 4000 });
          this.loadFleet();
        },
        error: (err) => {
          const msg = typeof err.error === 'string'
            ? err.error
            : err.error?.error ?? 'Failed to reassign crew';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
    });
  }

  retireVehicle(v: DispatchVehicle): void {
    const ok = confirm(
      `Retire ${v.plateNumber}?\n\nThis will unassign the crew and remove it from active dispatch. Historical trip data is preserved.`
    );
    if (!ok) return;

    this.saccoService.removeVehicle(v.id).subscribe({
      next: (msg) => {
        this.snackBar.open(`✓ ${msg}`, 'Close', { duration: 4000 });
        this.loadFleet();
      },
      error: (err) => {
        const msg = typeof err.error === 'string'
          ? err.error
          : err.error?.error ?? 'Failed to retire vehicle';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }
}