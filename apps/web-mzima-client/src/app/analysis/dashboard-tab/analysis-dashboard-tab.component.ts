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
 * reports-by-county pie chart, and monthly/daily reports trend charts.
 * Replaces the old UNICC fork's dashboard.component.ts (posts/dashboardregion,
 * posts/dashboardtrend — the new stack has no equivalent server-side
 * month/year-bounded endpoint, so the trend split is approximated via
 * posts/stats's timeline/timeline_interval bucketing, bounded by
 * created_after/created_before for the selected year or month). See
 * ushahidi-client/LIBERIA_CUSTOM.md.
 */
@Component({
  selector: 'app-analysis-dashboard-tab',
  templateUrl: './analysis-dashboard-tab.component.html',
  styleUrls: ['./analysis-dashboard-tab.component.scss'],
})
export class AnalysisDashboardTabComponent implements OnInit {
  public forms: any[] = [];
  public selectedFormId: number | 'all' = 'all';

  public filterMode: 'all' | 'custom' = 'all';
  public dateFrom: Date | null = null;
  public dateTo: Date | null = null;

  // Independent survey selector scoping just the two trend charts, mirroring
  // the old platform's separate "chart group" selector.
  public chartFormId: number | 'all' = 'all';
  public selectedYear = dayjs().year();
  public selectedMonth = dayjs().month(); // 0-11

  public totalReports = 0;
  public countyData: { name: string; value: number }[] = [];
  public monthlyTrendData: { name: string; series: { name: string; value: number }[] }[] = [];
  public dailyTrendData: { name: string; series: { name: string; value: number }[] }[] = [];

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
    this.refreshTrends();
  }

  private baseFilterParams(): Record<string, any> {
    const params: Record<string, any> = {};
    if (this.selectedFormId !== 'all') {
      params['form'] = [this.selectedFormId];
    }
    if (this.filterMode === 'custom') {
      if (this.dateFrom) {
        params['created_after'] = dayjs(this.dateFrom).format('YYYY-MM-DD');
      }
      if (this.dateTo) {
        params['created_before'] = dayjs(this.dateTo).format('YYYY-MM-DD');
      }
    }
    return params;
  }

  public onFormChange(): void {
    this.refresh();
  }

  public onFilterModeChange(): void {
    if (this.filterMode === 'all') {
      this.refresh();
    }
  }

  public onDateRangeApply(): void {
    this.refresh();
  }

  public onChartFormChange(): void {
    this.refreshTrends();
  }

  public refresh(): void {
    this.loadTotal();
    this.loadCountyBreakdown();
  }

  public refreshTrends(): void {
    this.loadMonthlyTrend();
    this.loadDailyTrend();
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

  private chartFilterParams(): Record<string, any> {
    const params: Record<string, any> = {};
    if (this.chartFormId !== 'all') {
      params['form'] = [this.chartFormId];
    }
    return params;
  }

  public get selectedYearLabel(): string {
    return String(this.selectedYear);
  }

  public prevYear(): void {
    this.selectedYear -= 1;
    this.loadMonthlyTrend();
  }

  public nextYear(): void {
    this.selectedYear += 1;
    this.loadMonthlyTrend();
  }

  private loadMonthlyTrend(): void {
    const start = dayjs().year(this.selectedYear).startOf('year');
    const end = start.endOf('year');
    const params = {
      ...this.chartFilterParams(),
      created_after: start.format('YYYY-MM-DD'),
      created_before: end.format('YYYY-MM-DD'),
      timeline: true,
      // ~1 calendar month; exact enough for a 12-bucket yearly trend.
      timeline_interval: 2629800,
    };
    this.postsService.get('stats', params).subscribe({
      next: (response: any) => {
        const rows: StatsRow[] = response?.result?.group_by_total_posts ?? [];
        const series = rows
          .filter((row) => row.time_label)
          .sort((a, b) => (a.time_label ?? 0) - (b.time_label ?? 0))
          .map((row) => ({
            name: dayjs.unix(row.time_label as number).format('MMM'),
            value: row.total,
          }));
        this.monthlyTrendData = [{ name: this.translate.instant('analysis.reports'), series }];
      },
    });
  }

  public get selectedMonthLabel(): string {
    return dayjs().year(this.selectedYear).month(this.selectedMonth).format('MMMM YYYY');
  }

  public prevMonth(): void {
    const prev = dayjs().year(this.selectedYear).month(this.selectedMonth).subtract(1, 'month');
    this.selectedYear = prev.year();
    this.selectedMonth = prev.month();
    this.loadDailyTrend();
  }

  public nextMonth(): void {
    const next = dayjs().year(this.selectedYear).month(this.selectedMonth).add(1, 'month');
    this.selectedYear = next.year();
    this.selectedMonth = next.month();
    this.loadDailyTrend();
  }

  private loadDailyTrend(): void {
    const start = dayjs().year(this.selectedYear).month(this.selectedMonth).startOf('month');
    const end = start.endOf('month');
    const params = {
      ...this.chartFilterParams(),
      created_after: start.format('YYYY-MM-DD'),
      created_before: end.format('YYYY-MM-DD'),
      timeline: true,
      timeline_interval: 86400,
    };
    this.postsService.get('stats', params).subscribe({
      next: (response: any) => {
        const rows: StatsRow[] = response?.result?.group_by_total_posts ?? [];
        const series = rows
          .filter((row) => row.time_label)
          .sort((a, b) => (a.time_label ?? 0) - (b.time_label ?? 0))
          .map((row) => ({
            name: dayjs.unix(row.time_label as number).format('D'),
            value: row.total,
          }));
        this.dailyTrendData = [{ name: this.translate.instant('analysis.reports'), series }];
      },
    });
  }
}
