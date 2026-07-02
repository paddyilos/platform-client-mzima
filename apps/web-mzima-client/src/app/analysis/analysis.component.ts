import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Liberia PBO custom page — Analysis dashboard, replacing the old UNICC
 * fork's /dashboard/analysis (Dashboard + Analysis tabs). See
 * ushahidi-client/LIBERIA_CUSTOM.md.
 */
@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.scss'],
})
export class AnalysisComponent {
  // `/analysis-templates`'s "Apply" action deep-links here via
  // `?template=<id>`, which AnalysisReportBuilderTabComponent reads to
  // apply the template — but that only works if its tab is actually
  // mounted. mat-tab-group doesn't render inactive tab content until
  // activated, and Dashboard (index 0) is the default, so a fresh
  // navigation to this URL would land on Dashboard and never mount the
  // Report Builder tab at all. Select it up front whenever a template is
  // being applied.
  public selectedTabIndex = 0;

  constructor(route: ActivatedRoute) {
    if (route.snapshot.queryParamMap.has('template')) {
      this.selectedTabIndex = 1;
    }
  }
}
