import { Routes } from '@angular/router';
import { authGuard }         from './core/guards/auth.guard';
import { roleGuard }         from './core/guards/role.guard';

export const routes: Routes = [

  // ── Public auth routes ───────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component')
        .then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'setup-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },


  // ── Protected layout shell ───────────────────────────────────────
  // ProfilePanelComponent is embedded inside MainLayoutComponent —
  // it is NOT a route. It is a shared UI panel rendered in the layout
  // template and toggled via the profile button in the toolbar.
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component')
        .then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [

      // ── Super Admin ─────────────────────────────────────────────
      {
        path: 'admin/billing',
        loadComponent: () =>
          import('./features/admin/saas-revenue/saas-revenue.component')
            .then(m => m.SaasRevenueComponent),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] }
      },
      {
        path: 'admin/onboarding',
        loadComponent: () =>
          import('./features/admin/sacco-onboarding/sacco-onboarding.component')
            .then(m => m.SaccoOnboardingComponent),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'] }
      },

      // ── SACCO Manager ───────────────────────────────────────────
      {
        path: 'sacco/dispatch',
        loadComponent: () =>
          import('./features/sacco/fleet-dispatch/fleet-dispatch.component')
            .then(m => m.FleetDispatchComponent),
        canActivate: [roleGuard],
        data: { roles: ['SACCO_MANAGER'] }
      },
      {
        path: 'sacco/compliance',
        loadComponent: () =>
          import('./features/sacco/compliance-tracker/compliance-tracker.component')
            .then(m => m.ComplianceTrackerComponent),
        canActivate: [roleGuard],
        data: { roles: ['SACCO_MANAGER'] }
      },
      {
        path: 'sacco/register-vehicle',
        loadComponent: () =>
          import('./features/sacco/vehicle-registration/vehicle-registration.component')
            .then(m => m.VehicleRegistrationComponent),
        canActivate: [roleGuard],
        data: { roles: ['SACCO_MANAGER'] }
      },

      // ── Owner ───────────────────────────────────────────────────
      {
        path: 'owner/analytics',
        loadComponent: () =>
          import('./features/owner/analytics-dashboard/analytics-dashboard.component')
            .then(m => m.AnalyticsDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['OWNER'] }
      },
      {
        path: 'owner/tracking',
        loadComponent: () =>
          import('./features/owner/vehicle-tracker/vehicle-tracker.component')
            .then(m => m.VehicleTrackerComponent),
        canActivate: [roleGuard],
        data: { roles: ['OWNER'] }
      },
      {
        path: 'owner/subscription',
        loadComponent: () =>
          import('./features/owner/subscription-manager/subscription-manager.component')
            .then(m => m.SubscriptionManagerComponent),
        canActivate: [roleGuard],
        data: { roles: ['OWNER'] }
      },

      // ── Crew ────────────────────────────────────────────────────
      {
        path: 'crew/operations',
        loadComponent: () =>
          import('./features/crew/trip-logger/trip-logger.component')
            .then(m => m.TripLoggerComponent),
        canActivate: [roleGuard],
        data: { roles: ['CREW'] }
      },
      {
        path: 'crew/expenses',
        loadComponent: () =>
          import('./features/crew/expense-logger/expense-logger.component')
            .then(m => m.ExpenseLoggerComponent),
        canActivate: [roleGuard],
        data: { roles: ['CREW'] }
      },

      // ── Passenger ───────────────────────────────────────────────
      {
        path: 'passenger/search',
        loadComponent: () =>
          import('./features/passenger/route-search/route-search.component')
            .then(m => m.RouteSearchComponent),
        canActivate: [roleGuard],
        data: { roles: ['PASSENGER'] }
      },
      {
        path: 'passenger/book',
        loadComponent: () =>
          import('./features/passenger/seat-reservation/seat-reservation.component')
            .then(m => m.SeatReservationComponent),
        canActivate: [roleGuard],
        data: { roles: ['PASSENGER'] }
      },

      // ── Default child redirect ───────────────────────────────────
      {
        path: '',
        redirectTo: 'passenger/search',
        pathMatch: 'full'
      }
    ]
  },

  // ── Catch-all ────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: 'login'
  }
];