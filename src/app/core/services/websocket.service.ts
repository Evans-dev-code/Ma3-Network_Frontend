import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { Subject, Observable } from 'rxjs';

export interface LiveLocation {
  vehicleId: number;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private client: Client;
  private locationSubject = new Subject<LiveLocation>();
  private activeSubscriptions: Map<number, any> = new Map();

  constructor() {
    this.client = new Client({
      // Connect to the Spring Boot SockJS endpoint
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('🔗 Connected to Live GPS Tracking!');
        // If internet drops and reconnects, re-subscribe to all active vehicles
        this.activeSubscriptions.forEach((_, vehicleId) => {
          this.executeSubscription(vehicleId);
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      }
    });

    this.client.activate();
  }

  // Components will listen to this stream to get live updates
  public getLocationFeed(): Observable<LiveLocation> {
    return this.locationSubject.asObservable();
  }

  // Ask the backend for updates on a specific vehicle
  public trackVehicle(vehicleId: number): void {
    if (!this.activeSubscriptions.has(vehicleId)) {
      this.activeSubscriptions.set(vehicleId, null); // Register intent
      if (this.client.connected) {
        this.executeSubscription(vehicleId);
      }
    }
  }

  // Stop listening when leaving the page
  public stopTracking(vehicleId: number): void {
    const sub = this.activeSubscriptions.get(vehicleId);
    if (sub) { sub.unsubscribe(); }
    this.activeSubscriptions.delete(vehicleId);
  }

  private executeSubscription(vehicleId: number): void {
    const subscription = this.client.subscribe(`/topic/locations/${vehicleId}`, (message: IMessage) => {
      if (message.body) {
        const data: LiveLocation = JSON.parse(message.body);
        this.locationSubject.next(data);
      }
    });
    this.activeSubscriptions.set(vehicleId, subscription);
  }
}