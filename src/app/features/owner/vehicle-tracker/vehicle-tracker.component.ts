import {
  Component, OnInit, OnDestroy, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import * as L from 'leaflet';
import { OwnerService } from '../../../core/services/owner.service';

// Fix default Leaflet icon paths
const iconDefault = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41], iconAnchor:   [12, 41],
  popupAnchor: [1, -34], shadowSize:   [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-vehicle-tracker',
  standalone: true,
  imports: [CommonModule, MatIconModule, LeafletModule],
  templateUrl: './vehicle-tracker.component.html',
  styleUrl:    './vehicle-tracker.component.scss'
})
export class VehicleTrackerComponent implements OnInit, OnDestroy {

  private readonly ownerService = inject(OwnerService);

  mapOptions: L.MapOptions = {
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
      })
    ],
    zoom: 12,
    center: L.latLng(-1.2921, 36.8219)
  };

  mapLayers   = signal<L.Layer[]>([]);
  myFleet     = signal<any[]>([]);
  isLoading   = signal(true);
  selectedId  = signal<number | null>(null);

  private simulationInterval: any;
  private map?: L.Map;

  ngOnInit(): void {
    this.ownerService.getMyFleet().subscribe({
      next: (vehicles) => {
        const fleet = vehicles.map((v: any, i: number) => ({
          id:     v.id,
          plate:  v.plateNumber ?? 'Unknown',
          route:  v.route       ?? 'Unassigned',
          status: v.status === 'ACTIVE' ? 'Moving' : 'Parked',
          speed:  v.status === 'ACTIVE' ? 40 + Math.floor(Math.random()*20) : 0,
          // Spread around Nairobi CBD with consistent offset per vehicle
          lat: -1.2921 + (i * 0.012) - 0.03,
          lng:  36.8219 + (i * 0.015) - 0.03
        }));
        this.myFleet.set(fleet);
        this.updateMarkers();
        this.isLoading.set(false);
        this.startSimulation();
      },
      error: () => this.isLoading.set(false)
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.simulationInterval);
  }

  onMapReady(map: L.Map): void {
    this.map = map;
    setTimeout(() => map.invalidateSize(), 100);
  }

  selectVehicle(v: any): void {
    this.selectedId.set(v.id);
    if (this.map) {
      this.map.flyTo([v.lat, v.lng], 14, { duration: 1 });
    }
  }

  private updateMarkers(): void {
    const layers = this.myFleet().map(v => {
      const color   = v.speed > 0 ? '#10b981' : '#f43f5e';
      const isSelected = v.id === this.selectedId();

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:${isSelected?'18':'13'}px;
            height:${isSelected?'18':'13'}px;
            background:${color};
            border-radius:50%;
            border:2px solid ${isSelected?'#fff':'rgba(255,255,255,0.5)'};
            box-shadow:0 0 0 ${isSelected?'4':'2'}px ${color}44;
            transition:all .3s;
          "></div>`,
        iconSize:   [18, 18],
        iconAnchor: [9, 9]
      });

      return L.marker([v.lat, v.lng], { icon }).bindPopup(`
        <div style="font-family:'Segoe UI',sans-serif;min-width:160px;padding:4px">
          <div style="font-size:1rem;font-weight:800;color:#0f172a">${v.plate}</div>
          <div style="color:#64748b;font-size:.82rem;margin-bottom:8px">${v.route}</div>
          <div style="display:flex;justify-content:space-between;font-size:.82rem">
            <span>Status</span>
            <strong style="color:${color}">${v.status}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-top:4px">
            <span>Speed</span>
            <strong style="color:${color}">${v.speed} km/h</strong>
          </div>
        </div>
      `);
    });
    this.mapLayers.set(layers);
  }

  private startSimulation(): void {
    // Replace with WebSocket: SockJS → /ws → subscribe /topic/locations/{vehicleId}
    this.simulationInterval = setInterval(() => {
      const updated = this.myFleet().map(v => {
        if (v.status !== 'Moving') return v;
        return {
          ...v,
          lat:   v.lat + (Math.random() - 0.5) * 0.002,
          lng:   v.lng + (Math.random() - 0.5) * 0.002,
          speed: Math.max(25, Math.min(90, v.speed + Math.floor((Math.random()-0.5)*8)))
        };
      });
      this.myFleet.set(updated);
      this.updateMarkers();
    }, 3000);
  }
}