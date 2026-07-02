import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  AnalysisChartConfig,
  AnalysisChartType,
  AnalysisGroupBy,
  AnalysisTemplate,
  AnalysisTemplatesService,
  apiHelpers,
  CategoriesService,
  CategoryInterface,
  FormAttributeInterface,
  PostsService,
  SurveysService,
} from '@mzima-client/sdk';
import { TranslateService } from '@ngx-translate/core';
import { ScaleType } from '@swimlane/ngx-charts';
import { Color } from '@swimlane/ngx-charts/lib/utils/color-sets';
import dayjs from 'dayjs';
import { AnalysisPdfExportService } from '../analysis-pdf-export.service';
import { SaveTemplateDialogComponent } from '../save-template-dialog/save-template-dialog.component';

/** One chart panel of a (possibly multi-chart) report, plus its rendered data. */
interface ReportChart extends AnalysisChartConfig {
  data: { name: string; value: number }[];
}

const DEFAULT_CHART: () => ReportChart = () => ({
  group_by: 'status',
  group_by_attribute_key: undefined,
  chart_type: 'bar',
  data: [],
});

/**
 * Attribute types/inputs that make sense as a group-by dimension. Excludes
 * point/geometry/media/description/title (no single groupable "value"), and
 * plain free-text fields (input=text with type=varchar) — mirrors the old
 * UNICC fork's Flexmonster pivotability rule
 * (libs/core/domain/filters/filters.helper.ts:GetAllReportColumns). `tags`
 * type is also excluded: those already have a dedicated `tags` group-by
 * option covering the post's overall categories via the same posts_tags
 * join, and the backend's attribute group-by (Phase 0) doesn't support it.
 */
function isPivotableField(field: FormAttributeInterface): boolean {
  const excludedTypes = ['point', 'geometry', 'description', 'media', 'title', 'tags'];
  if (excludedTypes.includes(field.type)) {
    return false;
  }
  if (field.input === 'text' && field.type === 'varchar') {
    return false;
  }
  return true;
}

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
  @ViewChild('reportContainer') reportContainer?: ElementRef<HTMLElement>;

  public forms: any[] = [];
  public templates: AnalysisTemplate[] = [];
  public categories: CategoryInterface[] = [];
  public surveyFields: FormAttributeInterface[] = [];

  public selectedFormId: number | null = null;
  public dateFrom: string | null = null;
  public dateTo: string | null = null;
  public statusFilter: string[] = [];
  public tagsFilter: number[] = [];

  public charts: ReportChart[] = [DEFAULT_CHART()];
  public hasPreviewed = false;
  public showMap = false;
  public appliedTemplateName: string | null = null;

  public colorScheme: Color = {
    name: 'Custom color',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#FFEBBB', '#F9CE7B', '#F1A661', '#E67E4D', '#D6553A'],
  };

  constructor(
    private postsService: PostsService,
    private surveysService: SurveysService,
    private categoriesService: CategoriesService,
    private analysisTemplatesService: AnalysisTemplatesService,
    private pdfExportService: AnalysisPdfExportService,
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
    this.categoriesService
      .getCategories({ only: apiHelpers.ONLY.TAG_ID_PARENTID_PARENT_SLUG })
      .subscribe({
        next: (response: any) => {
          this.categories = response?.results ?? [];
        },
      });
    this.loadTemplates();

    const templateId = this.route.snapshot.queryParamMap.get('template');
    if (templateId) {
      this.applyTemplate(Number(templateId));
    }
  }

  public onFormChange(): void {
    this.surveyFields = [];
    if (!this.selectedFormId) {
      return;
    }
    this.surveysService.getSurveyById(this.selectedFormId).subscribe({
      next: (response: any) => {
        const tasks = response?.result?.tasks ?? [];
        this.surveyFields = tasks
          .flatMap((task: any) => task.fields ?? [])
          .filter(isPivotableField);
      },
    });
  }

  private loadTemplates(): void {
    this.analysisTemplatesService.list().subscribe({
      next: (response) => {
        this.templates = response?.results ?? [];
      },
    });
  }

  public addChart(): void {
    this.charts.push(DEFAULT_CHART());
  }

  public removeChart(index: number): void {
    this.charts.splice(index, 1);
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
    if (this.statusFilter.length) {
      params['status[]'] = this.statusFilter;
    }
    if (this.tagsFilter.length) {
      params['tags[]'] = this.tagsFilter;
    }
    return params;
  }

  public preview(): void {
    this.charts.forEach((chart) => this.previewChart(chart));
    this.hasPreviewed = true;
  }

  private previewChart(chart: ReportChart): void {
    if (chart.group_by === 'county' || chart.group_by === 'district') {
      this.previewChartByLocation(chart);
      return;
    }

    const params: Record<string, any> = {
      ...this.buildFilterParams(),
      group_by: chart.group_by,
    };
    if (chart.group_by === 'attribute' && chart.group_by_attribute_key) {
      params['group_by_attribute_key'] = chart.group_by_attribute_key;
    }

    this.postsService.get('stats', params).subscribe({
      next: (response: any) => {
        const rows = response?.result?.group_by_total_posts ?? [];
        chart.data = rows.map((row: any) => ({
          name: row.label || this.translate.instant('analysis.unlabeled'),
          value: row.total,
        }));
      },
    });
  }

  private previewChartByLocation(chart: ReportChart): void {
    const field = chart.group_by === 'county' ? 'mgmt_lev_1' : 'mgmt_lev_2';
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
        chart.data = Object.keys(counts).map((name) => ({ name, value: counts[name] }));
      },
    });
  }

  public chartSeries(
    chart: ReportChart,
  ): { name: string; series: { name: string; value: number }[] }[] {
    return [{ name: this.translate.instant('analysis.reports'), series: chart.data }];
  }

  /** True once at least one chart is grouping by county/district — shows the map toggle. */
  public get hasLocationChart(): boolean {
    return this.charts.some(
      (chart) => chart.group_by === 'county' || chart.group_by === 'district',
    );
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
      const reportConfig: AnalysisChartConfig[] = this.charts.map((chart) => ({
        group_by: chart.group_by,
        group_by_attribute_key: chart.group_by_attribute_key || undefined,
        chart_type: chart.chart_type,
      }));
      const payload: Partial<AnalysisTemplate> = {
        name,
        form_id: this.selectedFormId ?? undefined,
        date_range_start: this.dateFrom
          ? Math.floor(new Date(this.dateFrom).getTime() / 1000)
          : undefined,
        date_range_end: this.dateTo
          ? Math.floor(new Date(this.dateTo).getTime() / 1000)
          : undefined,
        report_config: reportConfig,
        status_filter: this.statusFilter.length ? this.statusFilter : undefined,
        tags_filter: this.tagsFilter.length ? this.tagsFilter : undefined,
        // Fast-path summary columns, kept for backward compatibility.
        group_by: reportConfig[0]?.group_by,
        group_by_attribute_key: reportConfig[0]?.group_by_attribute_key,
        chart_type: reportConfig[0]?.chart_type,
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
        this.onFormChange();
        this.dateFrom = template.date_range_start
          ? new Date(template.date_range_start * 1000).toISOString().slice(0, 10)
          : null;
        this.dateTo = template.date_range_end
          ? new Date(template.date_range_end * 1000).toISOString().slice(0, 10)
          : null;
        this.statusFilter = template.status_filter ?? [];
        this.tagsFilter = template.tags_filter ?? [];
        this.appliedTemplateName = template.name;

        const reportConfig = template.report_config?.length
          ? template.report_config
          : ([
              {
                group_by: (template.group_by as AnalysisGroupBy) ?? 'status',
                group_by_attribute_key: template.group_by_attribute_key,
                chart_type: (template.chart_type as AnalysisChartType) ?? 'bar',
              },
            ] as AnalysisChartConfig[]);
        this.charts = reportConfig.map((chart) => ({ ...chart, data: [] }));

        this.preview();
      },
    });
  }

  public exportPdf(): void {
    if (!this.reportContainer) {
      return;
    }
    const title = this.appliedTemplateName || this.translate.instant('analysis.ad_hoc_report');
    const dateRangeText =
      this.dateFrom || this.dateTo
        ? `${this.translate.instant('analysis.date_range_label')}: ${
            this.dateFrom ? dayjs(this.dateFrom).format('YYYY-MM-DD') : '…'
          } – ${this.dateTo ? dayjs(this.dateTo).format('YYYY-MM-DD') : '…'}`
        : '';
    this.pdfExportService.exportChartsToPdf(
      this.reportContainer.nativeElement,
      title,
      dateRangeText,
    );
  }
}
