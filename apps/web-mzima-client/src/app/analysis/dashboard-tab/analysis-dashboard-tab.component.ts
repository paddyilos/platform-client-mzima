import { Component, OnInit } from '@angular/core';
import { PostsService, SurveysService } from '@mzima-client/sdk';
import { TranslateService } from '@ngx-translate/core';
import { ScaleType } from '@swimlane/ngx-charts';
import { Color } from '@swimlane/ngx-charts/lib/utils/color-sets';
import dayjs from 'dayjs';

interface StatsRow {
  label: string;
  total: number;
  time_label?: number;
}

/**
 * "Dashboard" tab of the Liberia PBO Analysis page — total reports stat,
 * reports-by-county pie chart, and a reports trend line chart. Replaces the
 * old UNICC fork's dashboard.component.ts (posts/dashboardregion,
 * posts/dashboardtrend). See ushahidi-client/LIBERIA_CUSTOM.md.
 */
@Component({
  selector: 'app-analysis-dashboard-tab',
  templateUrl: './analysis-dashboard-tab.component.html',
  styleUrls: ['./analysis-dashboard-tab.component.scss'],
})
export class AnalysisDashboardTabComponent implements OnInit {
  public forms: any[] = [];
  public selectedFormId: number | 'all' = 'all';
  public trendInterval: 'day' | 'month' = 'day';

  public totalReports = 0;
  public countyData: { name: string; value: number }[] = [];
  public trendData: { name: string; series: { name: string; value: number }[] }[] = [];

  public colorScheme: Color = {
    name: 'Custom color',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#FFEBBB', '#F9CE7B', '#F1A661', '#E67E4D', '#D6553A'],
  };

  constructor(
    private postsService: PostsService,
    private surveysService: SurveysService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.surveysService.get().subscribe({
      next: (response: any) => {
        this.forms = response?.results ?? [];
      },
    });
    this.refresh();
  }

  private baseFilterParams(): Record<string, any> {
    const params: Record<string, any> = {};
    if (this.selectedFormId !== 'all') {
      params['form'] = [this.selectedFormId];
    }
    return params;
  }

  public onFormChange(): void {
    this.refresh();
  }

  public onIntervalChange(): void {
    this.loadTrend();
  }

  public refresh(): void {
    this.loadTotal();
    this.loadCountyBreakdown();
    this.loadTrend();
  }

  private loadTotal(): void {
    this.postsService.get('stats', this.baseFilterParams()).subscribe({
      next: (response: any) => {
        this.totalReports = response?.result?.total_posts ?? 0;
      },
    });
  }

  private loadCountyBreakdown(): void {
    // `only=id,mgmt_lev_1` requests a sparse fieldset — fetching the full
    // post resource (media/translations/allowed_privileges/etc.) for
    // thousands of rows exhausts PHP's memory_limit server-side; the lean
    // fieldset keeps this well under it regardless of dataset size.
    const params = { ...this.baseFilterParams(), limit: 10000, only: 'id,mgmt_lev_1' };
    // searchPosts() always merges in a `q` param — an explicit '' (not
    // undefined) is required, since Angular's HttpClient serializes an
    // undefined param value as the literal string "undefined", which the
    // backend then treats as a real (zero-match) full-text search term.
    this.postsService.searchPosts('', '', params).subscribe({
      next: (response: any) => {
        const counts: Record<string, number> = {};
        (response?.results ?? []).forEach((post: any) => {
          const county = post.mgmt_lev_1 || this.translate.instant('analysis.unknown_county');
          counts[county] = (counts[county] || 0) + 1;
        });
        this.countyData = Object.keys(counts).map((name) => ({ name, value: counts[name] }));
      },
    });
  }

  private loadTrend(): void {
    const timelineInterval = this.trendInterval === 'day' ? 86400 : 2629800;
    const params = {
      ...this.baseFilterParams(),
      timeline: true,
      timeline_interval: timelineInterval,
    };
    this.postsService.get('stats', params).subscribe({
      next: (response: any) => {
        const rows: StatsRow[] = response?.result?.group_by_total_posts ?? [];
        const format = this.trendInterval === 'day' ? 'MMM D' : 'MMM YYYY';
        const series = rows
          .filter((row) => row.time_label)
          .sort((a, b) => (a.time_label ?? 0) - (b.time_label ?? 0))
          .map((row) => ({
            name: dayjs.unix(row.time_label as number).format(format),
            value: row.total,
          }));
        this.trendData = [{ name: this.translate.instant('analysis.reports'), series }];
      },
    });
  }
}
