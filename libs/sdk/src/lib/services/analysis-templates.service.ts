import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvLoader } from '../loader';
import { ResourceService } from './resource.service';
import { apiHelpers } from '../helpers';

export interface AnalysisTemplate {
  id?: number;
  name: string;
  form_id?: number;
  date_range_start?: number;
  date_range_end?: number;
  /** @deprecated pre-WebDataRocks single-chart fast-path column, unused by current UI */
  group_by?: string;
  /** @deprecated pre-WebDataRocks single-chart fast-path column, unused by current UI */
  group_by_attribute_key?: string;
  /** @deprecated pre-WebDataRocks single-chart fast-path column, unused by current UI */
  chart_type?: string;
  /**
   * One WebDataRocks `Report` (from `WebDataRocks.Pivot.getReport()`, with
   * `dataSource.data` stripped — that's always re-fetched live on apply)
   * per pivot instance in a multi-pivot report. Shape is library-defined
   * (see `@webdatarocks/webdatarocks`'s `Report` type), opaque here.
   */
  report_config?: any[];
  status_filter?: string[];
  tags_filter?: number[];
  user_id?: number;
  created?: number;
  updated?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnalysisTemplatesService extends ResourceService<any> {
  constructor(
    protected override httpClient: HttpClient,
    protected override currentLoader: EnvLoader,
  ) {
    super(httpClient, currentLoader);
  }

  getApiVersions(): string {
    return apiHelpers.API_V_5;
  }

  getResourceUrl(): string {
    return 'analysis-templates';
  }

  list(formId?: number): Observable<{ count: number; results: AnalysisTemplate[] }> {
    return super.get(undefined, formId ? { form_id: formId } : undefined);
  }

  getTemplate(id: number): Observable<{ result: AnalysisTemplate }> {
    return super.getById(id);
  }

  createTemplate(payload: Partial<AnalysisTemplate>): Observable<{ result: AnalysisTemplate }> {
    return super.post(payload as AnalysisTemplate);
  }

  updateTemplate(
    id: number,
    payload: Partial<AnalysisTemplate>,
  ): Observable<{ result: AnalysisTemplate }> {
    return super.update(id, payload as AnalysisTemplate);
  }

  deleteTemplate(id: number): Observable<any> {
    return super.delete(id);
  }
}
