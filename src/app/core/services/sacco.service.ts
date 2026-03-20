import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SaccoService {

  private readonly http   = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/sacco`;

  // JWT is attached automatically by the global auth interceptor.
  // No manual getHeaders() needed here.

  registerVehicle(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vehicle`, payload);
  }

  getFleet(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fleet`);
  }

  reassignCrew(vehicleId: number, payload: any): Observable<string> {
    return this.http.put<string>(
      `${this.apiUrl}/vehicle/${vehicleId}/crew`, payload,
      { responseType: 'text' as 'json' }
    );
  }

  removeVehicle(vehicleId: number): Observable<string> {
    return this.http.delete<string>(
      `${this.apiUrl}/vehicle/${vehicleId}`,
      { responseType: 'text' as 'json' }
    );
  }

  updateConductor(vehicleId: number, conductorEmail: string | null): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/vehicle/${vehicleId}/conductor`,
      { conductorEmail: conductorEmail ?? '' }
    );
  }

  // ── Routes ────────────────────────────────────────────────────────────

getRoutes(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/routes`);
}

createRoute(body: { name: string; startPoint: string; endPoint: string }): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/routes`, body);
}

updateRoute(id: number, body: { name?: string; startPoint?: string; endPoint?: string }): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/routes/${id}`, body);
}

deleteRoute(id: number): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}/routes/${id}`);
}
}