import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/v1/auth';
  
  currentUser = signal<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromToken();
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthResponse(response.token))
    );
  }

  register(user: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, user).pipe(
      tap(response => this.handleAuthResponse(response.token))
    );
  }

  requestPasswordSetup(email: string): Observable<any> {
    // The backend expects email as a query parameter (@RequestParam)
    return this.http.post(
      `${this.apiUrl}/setup-password-request?email=${encodeURIComponent(email)}`, 
      {}, 
      { responseType: 'text' as 'json' }
    );
  }

  setupPassword(token: string, newPassword: string): Observable<any> {
    // The backend expects token and newPassword as query parameters
    return this.http.post(
      `${this.apiUrl}/reset-password?token=${encodeURIComponent(token)}&newPassword=${encodeURIComponent(newPassword)}`, 
      {}, 
      { responseType: 'text' as 'json' }
    );
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('jwt_token');
  }

  getUserRole(): string | null {
    const user = this.currentUser();
    return user ? user.role : null;
  }

  hasActiveSubscription(): boolean {
    const user = this.currentUser();
    return user ? user.hasActiveSubscription : false;
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  private handleAuthResponse(token: string): void {
    localStorage.setItem('jwt_token', token);
    this.loadUserFromToken();
  }

  private loadUserFromToken(): void {
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUser.set({
          email: payload.sub,
          role: payload.role,
          hasActiveSubscription: payload.hasActiveSubscription
        });
      } catch (e) {
        this.logout();
      }
    }
  }
}