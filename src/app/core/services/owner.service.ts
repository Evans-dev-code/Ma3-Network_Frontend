import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────
export interface ChartData       { name: string; value: number; }
export interface ChartSeriesData { name: string; series: ChartData[]; }

export interface VehiclePerformance {
  vehicleId:                number;
  plateNumber:              string;
  route:                    string;
  status:                   string;
  dailyTarget:              number;
  todayNetProfit:           number;
  targetAchievementPercent: number;
  serviceDue:               boolean;
  serviceHealthPercent:     number;
  kmSinceLastService:       number;
  complianceExpiringSoon:   boolean;
  ntsaExpiry:               string;
  insuranceExpiry:          string;
  tlbExpiry:                string;
}

export interface MaintenanceAlert {
  vehicleId:            number;
  plateNumber:          string;
  kmSinceLastService:   number;
  serviceInterval:      number;
  serviceHealthPercent: number;
}

export interface ComplianceAlert {
  vehicleId:       number;
  plateNumber:     string;
  ntsaExpiry:      string;
  insuranceExpiry: string;
  tlbExpiry:       string;
}

export interface AlertSummary {
  maintenanceAlerts: MaintenanceAlert[];
  complianceAlerts:  ComplianceAlert[];
}

export interface AnalyticsDashboard {
  totalVehicles:        number;
  activeVehicles:       number;
  totalTrips:           number;
  totalGrossRevenue:    number;
  totalNetProfit:       number;
  totalExpenses:        number;
  totalFuelExpense:     number;
  totalOtherExpenses:   number;
  totalMaintenanceCost: number;
  todayNetProfit:       number;
  vehiclePerformances:  VehiclePerformance[];
  expenseBreakdown:     ChartData[];
  maintenanceCostByType: ChartData[];
  routePerformance:     ChartData[];
  weeklyTrend:          ChartSeriesData[];
  maintenanceAlerts:    MaintenanceAlert[];
  complianceAlerts:     ComplianceAlert[];
}

export interface MaintenancePayload {
  vehicle:          { id: number };
  maintenanceType:  string;
  description:      string;
  mileageAtService: number;
  cost:             number;
  performedBy?:     string;
}

export interface DateRange {
  from?: string;
  to?:   string;
}

export interface SubscriptionStatus {
  active:           boolean;
  status:           string;   // ACTIVE | EXPIRED | NO_SUBSCRIPTION
  tier:             string;
  startDate:        string;
  endDate:          string;
  daysRemaining:    number;
  nextBillingDate:  string;
  vehicleCount:     number;
  costPerVehicle:   number;
  totalMonthlyCost: number;
}

// ── Service ───────────────────────────────────────────────────────────────
// JWT is handled globally by jwtInterceptor — no manual headers needed here.
@Injectable({ providedIn: 'root' })
export class OwnerService {

  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/owner`;

  getAnalytics(range?: DateRange): Observable<AnalyticsDashboard> {
    let params = new HttpParams();
    if (range?.from) params = params.set('from', range.from);
    if (range?.to)   params = params.set('to',   range.to);
    return this.http.get<AnalyticsDashboard>(`${this.base}/analytics`, { params });
  }

  getAlerts(): Observable<AlertSummary> {
    return this.http.get<AlertSummary>(`${this.base}/alerts`);
  }

  getMyFleet(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/fleet`);
  }

  updateDailyTarget(vehicleId: number, target: number): Observable<any> {
    return this.http.put<any>(`${this.base}/vehicle/${vehicleId}/target`, { target });
  }

  addMaintenanceRecord(record: MaintenancePayload): Observable<any> {
    return this.http.post<any>(`${this.base}/maintenance`, record);
  }

  getMaintenanceHistory(vehicleId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/vehicle/${vehicleId}/maintenance`);
  }

  getSubscriptionStatus(): Observable<SubscriptionStatus> {
  return this.http.get<SubscriptionStatus>(
    `${this.base}/subscription/status`);
}

activateSubscription(): Observable<SubscriptionStatus> {
  return this.http.post<SubscriptionStatus>(
    `${this.base}/subscription/activate`, {});
}
}