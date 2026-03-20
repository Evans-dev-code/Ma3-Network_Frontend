import {
  Component, inject, OnInit, signal, computed, HostListener
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService }     from '../../core/services/auth.service';
import { ProfilePanelComponent } from '../../shared/ui/profile-panel/profile-panel.component';
import { UserProfile }     from '../../core/services/user-profile.service';

interface NavItem {
  label: string;
  icon:  string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatIconModule, MatButtonModule, MatTooltipModule,
    ProfilePanelComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl:    './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {

  private authService = inject(AuthService);
  private router      = inject(Router);

  navItems    = signal<NavItem[]>([]);
  userEmail   = signal<string>('');
  userRole    = signal<string>('');
  sidenavOpen = signal(false);
  profileOpen = signal(false);
  isMobile    = signal(false);
  isTablet    = signal(false);

  isDark = computed(() => ['OWNER', 'CREW'].includes(this.userRole()));

  userInitial = computed(() =>
    this.userEmail()?.charAt(0)?.toUpperCase() ?? '?');

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 640);
    this.isTablet.set(window.innerWidth < 1024);
    if (window.innerWidth < 640) this.sidenavOpen.set(false);
  }

  ngOnInit(): void {
    this.onResize();
    const user = this.authService.currentUser();
    if (user) {
      this.userEmail.set(user.email);
      this.userRole.set(user.role);
      this.buildMenu(user.role);
    }
  }

  toggleSidenav(): void   { this.sidenavOpen.update(v => !v); }
  toggleProfile(): void   { this.profileOpen.update(v => !v); }
  closeProfile(): void    { this.profileOpen.set(false); }

  onProfileUpdated(p: UserProfile): void {
    this.userEmail.set(p.email);
  }

  private buildMenu(role: string): void {
    const menus: Record<string, NavItem[]> = {
      SUPER_ADMIN: [
        { label: 'SaaS Revenue', icon: 'payments',      route: '/admin/billing'     },
        { label: 'Onboarding',   icon: 'domain_add',    route: '/admin/onboarding'  }
      ],
      SACCO_MANAGER: [
        { label: 'Fleet Dispatch', icon: 'directions_bus', route: '/sacco/dispatch'         },
        { label: 'Compliance',     icon: 'verified',       route: '/sacco/compliance'       },
        { label: 'Add Vehicle',    icon: 'add_circle',     route: '/sacco/register-vehicle' }
      ],
      OWNER: [
        { label: 'Analytics',     icon: 'bar_chart',   route: '/owner/analytics'    },
        { label: 'Live Tracking', icon: 'location_on', route: '/owner/tracking'     },
        { label: 'Subscription',  icon: 'credit_card', route: '/owner/subscription' }
      ],
      CREW: [
        { label: 'Trip Logger', icon: 'trip_origin',  route: '/crew/operations' },
        { label: 'Expenses',    icon: 'receipt_long', route: '/crew/expenses'   }
      ]
    };
    this.navItems.set(menus[role] ?? [
      { label: 'Find Route',  icon: 'search',      route: '/passenger/search' },
      { label: 'My Bookings', icon: 'book_online', route: '/passenger/book'   }
    ]);
  }

  getRoleLabel(): string {
    const labels: Record<string, string> = {
      SUPER_ADMIN:   'Super Admin',
      SACCO_MANAGER: 'SACCO Manager',
      OWNER:         'Fleet Owner',
      CREW:          'Crew Member',
      PASSENGER:     'Passenger'
    };
    return labels[this.userRole()] ?? this.userRole();
  }

  getRoleColor(): string {
    const colors: Record<string, string> = {
      OWNER:         '#10b981',
      CREW:          '#f59e0b',
      SACCO_MANAGER: '#3b82f6',
      SUPER_ADMIN:   '#8b5cf6'
    };
    return colors[this.userRole()] ?? '#64748b';
  }

  logout(): void { this.authService.logout(); }
}