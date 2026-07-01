import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  AnalysisTemplate,
  AnalysisTemplatesService,
  PostsService,
  SurveysService,
} from '@mzima-client/sdk';
import { TranslateService } from '@ngx-translate/core';
import { ScaleType } from '@swimlane/ngx-charts';
import { Color } from '@swimlane/ngx-charts/lib/utils/color-sets';
import { SaveTemplateDialogComponent } from '../save-template-dialog/save-template-dialog.component';

type ChartType = 'bar' | 'pie' | 'line';
type GroupBy = 'status' | 'form' | 'tags' | 'county' | 'district' | 'attribute';

/**
 * "Report Builder" tab of the Liberia PBO Analysis page — an ad-hoc
 * filter/chart builder, replacing the old UNICC fork's Flexmonster-based
 * post-filters.component.ts. Renders with ngx-charts instead of a
 * commercial pivot widget. See ushahidi-client/LIBERIA_CUSTOM.md.
 */
@Component({
  selector: 'app-analysis-report-builder-tab',
  templateUrl: './analysis-report-builder-tab.component.html',
  styleUrls: ['./analysis-report-builder-tab.component.scss'],
})
export class AnalysisReportBuilderTabComponent implements OnInit {
  public forms: any[] = [];
  public templates: AnalysisTemplate[] = [];

  public selectedFormId: number | null = null;
  public dateFrom: string | null = null;
  public dateTo: string | null = null;
  public groupBy: GroupBy = 'status';
  public groupByAttributeKey = '';
  public chartType: ChartType = 'bar';

  public data: any[] = [];
  public hasPreviewed = false;

  public colorScheme: Color = {
    name: 'Custom color',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#FFEBBB', '#F9CE7B', '#F1A661', '#E67E4D', '#D6553A'],
  };

  constructor(
    private postsService: PostsService,
    private surveysService: SurveysService,
    private analysisTemplatesService: AnalysisTemplatesService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.surveysService.get().subscribe({
      next: (response: any) => {
        this.forms = response?.results ?? [];
      },
    });
    this.loadTemplates();

    const templateId = this.route.snapshot.queryParamMap.get('template');
    if (templateId) {
      this.applyTemplate(Number(templateId));
    }
  }

  private loadTemplates(): void {
    this.analysisTemplatesService.list().subscribe({
      next: (response) => {
        this.templates = response?.results ?? [];
      },
    });
  }

  private buildFilterParams(): Record<string, any> {
    const params: Record<string, any> = {};
    if (this.selectedFormId) {
      params['form'] = [this.selectedFormId];
    }
    if (this.dateFrom) {
      params['created_after'] = this.dateFrom;
    }
    if (this.dateTo) {
      params['created_before'] = this.dateTo;
    }
    return params;
  }

  public preview(): void {
    if (this.groupBy === 'county' || this.groupBy === 'district') {
      this.previewByLocation();
      return;
    }

    const params: Record<string, any> = {
      ...this.buildFilterParams(),
      group_by: this.groupBy,
    };
    if (this.groupBy === 'attribute' && this.groupByAttributeKey) {
      params['group_by_attribute_key'] = this.groupByAttributeKey;
    }

    this.postsService.get('stats', params).subscribe({
      next: (response: any) => {
        const rows = response?.result?.group_by_total_posts ?? [];
        this.data = rows.map((row: any) => ({
          name: row.label || this.translate.instant('analysis.unlabeled'),
          value: row.total,
        }));
        this.hasPreviewed = true;
      },
    });
  }

  private previewByLocation(): void {
    const field = this.groupBy === 'county' ? 'mgmt_lev_1' : 'mgmt_lev_2';
    // See analysis-dashboard-tab.component.ts's loadCountyBreakdown() for
    // why `only` is needed (avoids a server-side memory exhaustion on the
    // full post payload) and why `q` must be '' rather than undefined.
    const params = { ...this.buildFilterParams(), limit: 10000, only: `id,${field}` };
    this.postsService.searchPosts('', '', params).subscribe({
      next: (response: any) => {
        const counts: Record<string, number> = {};
        (response?.results ?? []).forEach((post: any) => {
          const key = post[field] || this.translate.instant('analysis.unknown_county');
          counts[key] = (counts[key] || 0) + 1;
        });
        this.data = Object.keys(counts).map((name) => ({ name, value: counts[name] }));
        this.hasPreviewed = true;
      },
    });
  }

  public get chartSeries(): { name: string; series: { name: string; value: number }[] }[] {
    return [{ name: this.translate.instant('analysis.reports'), series: this.data }];
  }

  public saveAsTemplate(): void {
    const dialogRef = this.dialog.open(SaveTemplateDialogComponent, {
      width: '100%',
      maxWidth: '480px',
      panelClass: ['modal'],
    });
    dialogRef.afterClosed().subscribe((name: string | undefined) => {
      if (!name) {
        return;
      }
      const payload: Partial<AnalysisTemplate> = {
        name,
        form_id: this.selectedFormId ?? undefined,
        date_range_start: this.dateFrom
          ? Math.floor(new Date(this.dateFrom).getTime() / 1000)
          : undefined,
        date_range_end: this.dateTo
          ? Math.floor(new Date(this.dateTo).getTime() / 1000)
          : undefined,
        group_by: this.groupBy,
        group_by_attribute_key: this.groupByAttributeKey || undefined,
        chart_type: this.chartType,
      };
      this.analysisTemplatesService.createTemplate(payload).subscribe({
        next: () => this.loadTemplates(),
      });
    });
  }

  public applyTemplate(id: number): void {
    this.analysisTemplatesService.getTemplate(id).subscribe({
      next: (response) => {
        const template = response?.result;
        if (!template) {
          return;
        }
        this.selectedFormId = template.form_id ?? null;
        this.dateFrom = template.date_range_start
          ? new Date(template.date_range_start * 1000).toISOString().slice(0, 10)
          : null;
        this.dateTo = template.date_range_end
          ? new Date(template.date_range_end * 1000).toISOString().slice(0, 10)
          : null;
        this.groupBy = (template.group_by as GroupBy) ?? 'status';
        this.groupByAttributeKey = template.group_by_attribute_key ?? '';
        this.chartType = (template.chart_type as ChartType) ?? 'bar';
        this.preview();
      },
    });
  }
}
