import { Routes } from '@angular/router';
import { CombinedGuard, AccessAnalysisGuard } from '@guards';

/**
 * Liberia custom public routes — iReport Liberia PBO.
 *
 * Spread into app-routing.module.ts so the stock file's diff stays a
 * fixed two lines regardless of how many Liberia pages get added here.
 * See ushahidi-client/LIBERIA_CUSTOM.md for the full convention.
 */
export const liberiaRoutes: Routes = [
  {
    path: 'get-alerts',
    loadChildren: () => import('../get-alerts/get-alerts.module').then((m) => m.GetAlertsModule),
    data: { breadcrumb: 'Get Alerts' },
  },
  {
    path: 'contact-us',
    loadChildren: () => import('../contact-us/contact-us.module').then((m) => m.ContactUsModule),
    data: { breadcrumb: 'Contact Us' },
  },
  {
    path: 'about-us',
    loadChildren: () => import('../about-us/about-us.module').then((m) => m.AboutUsModule),
    data: { breadcrumb: 'About Us' },
  },
  {
    path: 'analysis',
    loadChildren: () => import('../analysis/analysis.module').then((m) => m.AnalysisModule),
    canActivate: [CombinedGuard],
    data: { breadcrumb: 'Analysis', guards: [AccessAnalysisGuard] },
  },
  {
    path: 'analysis-templates',
    loadChildren: () =>
      import('../analysis-templates/analysis-templates.module').then(
        (m) => m.AnalysisTemplatesModule,
      ),
    canActivate: [CombinedGuard],
    data: { breadcrumb: 'Analysis Templates', guards: [AccessAnalysisGuard] },
  },
];
