import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  AnalysisPivotDataService,
  AnalysisTemplate,
  AnalysisTemplatesService,
  apiHelpers,
  CategoriesService,
  CategoryInterface,
  SurveysService,
} from '@mzima-client/sdk';
import { TranslateService } from '@ngx-translate/core';
import { SaveTemplateDialogComponent } from '../save-template-dialog/save-template-dialog.component';

/** One `<app-wbr-pivot>` panel. `id` is a stable key independent of array
 * position, since WebDataRocks instances are tracked in a Map keyed by it
 * (see pivotInstances below) — array position shifts on add/remove, but a
 * mounted pivot's identity must not. */
interface Pivot {
  id: number;
  initialReport: any;
}

/**
 * "Report Builder" tab of the Liberia PBO Analysis page — a real pivot
 * table (WebDataRocks, free — not the commercial Flexmonster the old
 * platform used), replacing the old UNICC fork's Flexmonster-based
 * post-filters.component.ts, and this app's own prior chart-array
 * approximation. See ushahidi-client/LIBERIA_CUSTOM.md for why a
 * dedicated lean backend endpoint feeds it (client-side pivoting needs raw
 * per-post attribute values, and WebDataRocks' free tier hard-caps
 * payloads at 1MB) and for the license terms (branding cannot be hidden).
 */
@Component({
  selector: 'app-analysis-report-builder-tab',
  templateUrl: './analysis-report-builder-tab.component.html',
  styleUrls: ['./analysis-report-builder-tab.component.scss'],
})
export class AnalysisReportBuilderTabComponent implements OnInit {
  public forms: any[] = [];
  public templates: AnalysisTemplate[] = [];
  public categories: CategoryInterface[] = [];

  public selectedFormId: number | null = null;
  public dateFrom: string | null = null;
  public dateTo: string | null = null;
  public statusFilter: string[] = [];
  public tagsFilter: number[] = [];

  public pivots: Pivot[] = [];
  public hasLoadedData = false;
  public isLoading = false;
  public isTruncated = false;
  public totalCount = 0;
  public loadedCount = 0;
  public appliedTemplateName: string | null = null;

  public showMap = false;
  public countyData: { name: string; value: number }[] = [];
  public districtData: { name: string; value: number }[] = [];

  // Keyed by Pivot.id, not array index — see the Pivot interface comment.
  private pivotInstances = new Map<number, any>();
  private lastFetchedRows: Record<string, any>[] = [];
  private nextPivotId = 1;

  constructor(
    private pivotDataService: AnalysisPivotDataService,
    private surveysService: SurveysService,
    private categoriesService: CategoriesService,
    private analysisTemplatesService: AnalysisTemplatesService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private translate: TranslateService,
  ) {
    this.pivots = [this.newPivot()];
  }

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

  private newPivot(initialReport?: any): Pivot {
    return {
      id: this.nextPivotId++,
      initialReport: initialReport ?? { dataSource: { data: [] }, slice: {} },
    };
  }

  private loadTemplates(): void {
    this.analysisTemplatesService.list().subscribe({
      next: (response) => {
        this.templates = response?.results ?? [];
      },
    });
  }

  public addPivot(): void {
    // Give the new pivot the already-loaded data immediately, if any, so
    // it doesn't render empty until the next "Load data" click.
    this.pivots.push(this.newPivot({ dataSource: { data: this.lastFetchedRows } }));
  }

  public removePivot(index: number): void {
    const [removed] = this.pivots.splice(index, 1);
    this.pivotInstances.delete(removed.id);
  }

  /** Bound to `<app-wbr-pivot (ready)>` — fires once the underlying
   * WebDataRocks.Pivot instance exists and its imperative API (getReport/
   * setReport) becomes callable. */
  public onPivotReady(instance: any, pivotId: number): void {
    this.pivotInstances.set(pivotId, instance);
  }

  public loadData(): void {
    if (!this.selectedFormId) {
      return;
    }
    this.isLoading = true;
    this.pivotDataService
      .list({
        form_id: this.selectedFormId,
        created_after: this.dateFrom || undefined,
        created_before: this.dateTo || undefined,
        status: this.statusFilter,
        tags: this.tagsFilter,
      })
      .subscribe({
        next: (response) => {
          this.totalCount = response.total;
          this.loadedCount = response.count;
          this.isTruncated = response.truncated;
          this.lastFetchedRows = response.results;
          this.computeLocationBreakdown(response.results);

          // Recreate every pivot with the fetched rows baked into its
          // `report` from the start, preserving each one's current slice
          // (read live via getReport() where the instance is already
          // mounted, e.g. reloading after a filter change) — WebDataRocks'
          // updateData() does not reliably keep a pre-configured slice when
          // transitioning from empty to populated data (confirmed via
          // manual testing: a template-applied slice was silently replaced
          // by WebDataRocks' own auto-generated default once real data
          // arrived), so data must be present at construction, not patched
          // in afterward.
          this.pivots = this.pivots.map((pivot) => {
            let slice = pivot.initialReport?.slice;
            try {
              slice = this.pivotInstances.get(pivot.id)?.getReport()?.slice ?? slice;
            } catch {
              // keep the slice already captured above
            }
            return this.newPivot({ slice, dataSource: { data: response.results } });
          });
          this.pivotInstances.clear();

          this.hasLoadedData = true;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  private computeLocationBreakdown(rows: Record<string, any>[]): void {
    const unknown = this.translate.instant('analysis.unknown_county');
    const countCountyDistrict = (key: 'County' | 'District') => {
      const counts: Record<string, number> = {};
      rows.forEach((row) => {
        const value = row[key] || unknown;
        counts[value] = (counts[value] || 0) + 1;
      });
      return Object.keys(counts).map((name) => ({ name, value: counts[name] }));
    };
    this.countyData = countCountyDistrict('County');
    this.districtData = countCountyDistrict('District');
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
      const reportConfig = this.pivots.map((pivot) => {
        // getReport() can throw if called while the pivot is still settling
        // (see the comment in applyDataToPivot()) — fall back to whatever
        // report shape we already have rather than failing the whole save.
        let report = pivot.initialReport;
        try {
          report = this.pivotInstances.get(pivot.id)?.getReport() ?? report;
        } catch {
          // fall back to `report` as initialized above
        }
        // dataSource.data is always re-fetched live on apply, never persisted.
        const { dataSource, ...rest } = report;
        return rest;
      });
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
        this.statusFilter = template.status_filter ?? [];
        this.tagsFilter = template.tags_filter ?? [];
        this.appliedTemplateName = template.name;

        this.lastFetchedRows = [];
        this.hasLoadedData = false;
        this.pivotInstances.clear();
        const reportConfigs = template.report_config?.length ? template.report_config : [{}];
        this.pivots = reportConfigs.map((report: any) =>
          this.newPivot({ ...report, dataSource: { data: [] } }),
        );

        if (this.selectedFormId) {
          this.loadData();
        }
      },
    });
  }
}
