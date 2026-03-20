import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id:            number;
  firstName:     string;
  lastName:      string;
  email:         string;
  phoneNumber:   string;
  role:          string;
  documentCount: number;
}

export interface UserDocument {
  id:              number;
  documentType:    string;
  fileName:        string;
  fileSize:        string;
  mimeType:        string | null;  // ← allow null to fix optional chain warnings
  expiryDate:      string | null;
  uploadedAt:      string;
  daysUntilExpiry: number | null;
  expiryStatus:    'VALID' | 'EXPIRING' | 'EXPIRED' | 'NO_EXPIRY';
}

export interface MySacco {
  id:                 number;
  name:               string;
  registrationNumber: string;
  contactPhone:       string;
  tier:               string;
  maxVehicles:        number;
  monthlyFee:         number;
  subscriptionStatus: string;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {

  private readonly http      = inject(HttpClient);
  private readonly base      = `${environment.apiUrl}/api/v1/user`;
  private readonly saccoBase = `${environment.apiUrl}/api/v1/sacco`;

  // ── Profile ────────────────────────────────────────────────────────
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/profile`);
  }

  updateProfile(body: Partial<UserProfile>): Observable<any> {
    return this.http.put<any>(`${this.base}/profile`, body);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.put<any>(`${this.base}/password`, { oldPassword, newPassword });
  }

  // ── Documents ──────────────────────────────────────────────────────
  getDocuments(): Observable<UserDocument[]> {
    return this.http.get<UserDocument[]>(`${this.base}/documents`);
  }

  uploadDocument(
    file:         File,
    documentType: string,
    expiryDate?:  string
  ): Observable<any> {
    const form = new FormData();
    form.append('file',         file);
    form.append('documentType', documentType);
    if (expiryDate) form.append('expiryDate', expiryDate);
    return this.http.post<any>(`${this.base}/documents`, form);
  }

  deleteDocument(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/documents/${id}`);
  }

  // ── SACCO (manager only) ───────────────────────────────────────────
  getMySacco(): Observable<MySacco> {
    return this.http.get<MySacco>(`${this.saccoBase}/my-sacco`);
  }

  updateMySacco(body: { name?: string; contactPhone?: string }): Observable<any> {
    return this.http.put<any>(`${this.saccoBase}/my-sacco`, body);
  }
}