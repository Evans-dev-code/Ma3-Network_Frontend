import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces matching TripResponseDto & ExpenseResponseDto ──────────────
export interface TripResponse {
  id:             number;
  routeName:      string;
  status:         string;
  startTime:      string;
  endTime:        string | null;
  passengerCount: number;
  totalRevenue:   number;
  fuelExpense:    number;
  otherExpenses:  number;
  netProfit:      number;
  distanceKm:     number | null;
  vehicleId:      number;
  plateNumber:    string;
  route:          string;
  driverId:       number;
  driverName:     string;
}

export interface FinalizeRequest {
  passengerCount: number;
  totalRevenue:   number;
  fuelExpense:    number;
  otherExpenses:  number;
  distanceKm?:    number;
}

export interface ExpenseResponse {
  id:          number;
  amount:      number;
  category:    string;
  description: string;
  expenseDate: string;
  vehicleId:   number;
  plateNumber: string;
  crewId:      number;
  crewName:    string;
}

export interface MyVehicle {
  vehicleId:      number;
  plateNumber:    string;
  route:          string;
  dailyTarget:    number;
  currentMileage: number;
  crewRole:      'DRIVER' | 'CONDUCTOR';
  driverId:      number | null;
  conductorId:   number | null;
}

// ── Service ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CrewService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/crew`;

  // ── Vehicle ───────────────────────────────────────────────────────────
  getMyVehicle(): Observable<MyVehicle> {
    return this.http.get<MyVehicle>(`${this.baseUrl}/my-vehicle`);
  }

  // ── Trips ─────────────────────────────────────────────────────────────
  startTrip(tripData: { routeName: string; vehicle: { id: number } }): Observable<TripResponse> {
    return this.http.post<TripResponse>(`${this.baseUrl}/trip/start`, tripData);
  }

  updateTripStatus(tripId: number, status: string): Observable<TripResponse> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<TripResponse>(
      `${this.baseUrl}/trip/${tripId}/status`, null, { params });
  }

  finalizeTrip(tripId: number, data: FinalizeRequest): Observable<TripResponse> {
    return this.http.patch<TripResponse>(
      `${this.baseUrl}/trip/${tripId}/finalize`, data);
  }

  getTodayTrips(): Observable<TripResponse[]> {
    return this.http.get<TripResponse[]>(`${this.baseUrl}/trips/today`);
  }

  // ── Expenses ──────────────────────────────────────────────────────────
  logExpense(expenseData: {
    vehicle: { id: number };
    amount: number;
    category: string;
    description?: string;
  }): Observable<ExpenseResponse> {
    return this.http.post<ExpenseResponse>(`${this.baseUrl}/expense`, expenseData);
  }

  getTodayExpenses(): Observable<ExpenseResponse[]> {
    return this.http.get<ExpenseResponse[]>(`${this.baseUrl}/expenses/today`);
  }

  // ── GPS ───────────────────────────────────────────────────────────────
  broadcastLocation(vehicleId: number, lat: number, lng: number): Observable<void> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString());
    return this.http.post<void>(
      `${this.baseUrl}/vehicle/${vehicleId}/location`, null, { params });
  }

  getMyRoutes(): Observable<any[]> {
  return this.http.get<any[]>(`${environment.apiUrl}/api/v1/crew/routes`);
}
}