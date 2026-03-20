import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/v1/admin';

  // Helper to get headers (ensures Super Admin role is verified)
  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // NEW: Fetches the full platform analytics (MRR, Revenue Breakdown, etc.)
  getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics`, { headers: this.getHeaders() });
  }

  // Fetches the raw list of Saccos
  getSaccos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/saccos`, { headers: this.getHeaders() });
  }

  // Registers a new Sacco and its manager
  onboardSacco(saccoData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sacco`, saccoData, { headers: this.getHeaders() });
  }
}