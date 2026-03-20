import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule }       from '@angular/material/card';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatSelectModule }     from '@angular/material/select';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatIconModule }       from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  CrewService, TripResponse, MyVehicle
} from '../../../core/services/crew.service';

@Component({
  selector: 'app-trip-logger',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule
  ],
  templateUrl: './trip-logger.component.html',
  styleUrl:    './trip-logger.component.scss'
})
export class TripLoggerComponent implements OnInit, OnDestroy {

  private fb          = inject(FormBuilder);
  private crewService = inject(CrewService);
  private snackBar    = inject(MatSnackBar);

  // ── State ─────────────────────────────────────────────────────────
  isLoading      = signal(false);
  activeTrip     = signal<TripResponse | null>(null);
  myVehicle      = signal<MyVehicle | null>(null);
  isTrackingGps  = signal(false);
  isFinalizing   = signal(false);
  todayTrips     = signal<TripResponse[]>([]);
  dailyRevenue   = signal(0);
  dailyNetProfit = signal(0);

  // ── Routes from SACCO API ─────────────────────────────────────────
  saccoRoutes   = signal<any[]>([]);
  routesLoading = signal(false);

  // Whether this crew member is a driver (can start trips)
  crewRole = signal<'DRIVER' | 'CONDUCTOR' | null>(null);
  isDriver = computed(() => this.crewRole() === 'DRIVER');

  private gpsWatchId: number | null = null;

  // ── Forms ─────────────────────────────────────────────────────────
  tripForm: FormGroup = this.fb.group({
    routeName: ['', Validators.required]
  });

  finalizeForm: FormGroup = this.fb.group({
    passengerCount: ['', [Validators.required, Validators.min(1)]],
    totalRevenue:   ['', [Validators.required, Validators.min(0)]],
    fuelExpense:    [0,  [Validators.required, Validators.min(0)]],
    otherExpenses:  [0,  [Validators.required, Validators.min(0)]]
  });

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadMyVehicle();
    this.loadTodayTrips();
  }

  ngOnDestroy(): void {
    this.stopGpsTracking();
  }

  // ── Load vehicle + routes ─────────────────────────────────────────
  private loadMyVehicle(): void {
    this.crewService.getMyVehicle().subscribe({
      next: (v) => {
        this.myVehicle.set(v);
        this.crewRole.set(v.crewRole ?? 'DRIVER');
        // Load routes for this vehicle's SACCO
        this.loadRoutes();
      },
      error: () => this.snackBar.open(
        'Could not load your assigned vehicle. Contact your SACCO manager.',
        'OK', { duration: 5000 })
    });
  }

  private loadRoutes(): void {
    this.routesLoading.set(true);
    this.crewService.getMyRoutes().subscribe({
      next:  (r) => { this.saccoRoutes.set(r); this.routesLoading.set(false); },
      error: ()  => { this.routesLoading.set(false); }
    });
  }

  private loadTodayTrips(): void {
    this.crewService.getTodayTrips().subscribe({
      next: (trips) => {
        this.todayTrips.set(trips);
        this.calculateDailyTotals(trips);
      },
      error: (err) => console.error('Failed to load trips', err)
    });
  }

  private calculateDailyTotals(trips: TripResponse[]): void {
    const revenue = trips.reduce((s, t) => s + Number(t.totalRevenue ?? 0), 0);
    const profit  = trips.reduce((s, t) => s + Number(t.netProfit   ?? 0), 0);
    this.dailyRevenue.set(revenue);
    this.dailyNetProfit.set(profit);
  }

  // ── Trip actions ──────────────────────────────────────────────────
  startNewTrip(): void {
    if (this.tripForm.invalid) return;

    const vehicle = this.myVehicle();
    if (!vehicle) {
      this.snackBar.open('No vehicle assigned to your account.', 'OK', { duration: 4000 });
      return;
    }

    this.isLoading.set(true);
    this.crewService.startTrip({
      routeName: this.tripForm.value.routeName,
      vehicle:   { id: vehicle.vehicleId }
    }).subscribe({
      next: (trip) => {
        this.activeTrip.set(trip);
        this.isLoading.set(false);
        this.snackBar.open('Trip started — Status: BOARDING', 'Close', { duration: 3000 });
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to start trip.', 'Close', { duration: 3000 });
      }
    });
  }

  changeTripStatus(newStatus: string): void {
    const trip = this.activeTrip();
    if (!trip) return;

    if (newStatus === 'COMPLETED') {
      this.isFinalizing.set(true);
      return;
    }

    this.isLoading.set(true);
    this.crewService.updateTripStatus(trip.id, newStatus).subscribe({
      next: (updated) => {
        this.activeTrip.set(updated);
        this.isLoading.set(false);
        this.snackBar.open(`Status: ${newStatus}`, 'Close', { duration: 3000 });
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to update status.', 'Close', { duration: 3000 });
      }
    });
  }

  submitFinalTripData(): void {
    if (this.finalizeForm.invalid) return;

    const trip = this.activeTrip();
    if (!trip) return;

    this.isLoading.set(true);
    const { passengerCount, totalRevenue, fuelExpense, otherExpenses } =
      this.finalizeForm.value;

    this.crewService.finalizeTrip(trip.id, {
      passengerCount: Number(passengerCount),
      totalRevenue:   Number(totalRevenue),
      fuelExpense:    Number(fuelExpense   ?? 0),
      otherExpenses:  Number(otherExpenses ?? 0)
    }).subscribe({
      next: () => {
        this.activeTrip.set(null);
        this.isFinalizing.set(false);
        this.stopGpsTracking();
        this.tripForm.reset();
        this.finalizeForm.reset({ fuelExpense: 0, otherExpenses: 0 });
        this.loadTodayTrips();
        this.snackBar.open(
          '✓ Trip saved! Revenue synced to Owner dashboard.',
          'Close', { duration: 4000 });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to save trip data.', 'Close', { duration: 3000 });
      }
    });
  }

  // ── GPS ───────────────────────────────────────────────────────────
  toggleGpsTracking(): void {
    this.isTrackingGps() ? this.stopGpsTracking() : this.startGpsTracking();
  }

  private startGpsTracking(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('GPS not supported by this browser.', 'Close', { duration: 3000 });
      return;
    }
    const vehicleId = this.myVehicle()?.vehicleId;
    if (!vehicleId) return;

    this.isTrackingGps.set(true);
    this.snackBar.open('Live GPS Broadcast Started', 'Close', { duration: 2000 });

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.crewService.broadcastLocation(
          vehicleId, pos.coords.latitude, pos.coords.longitude
        ).subscribe();
      },
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  }

  private stopGpsTracking(): void {
    if (this.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
    this.isTrackingGps.set(false);
  }
}