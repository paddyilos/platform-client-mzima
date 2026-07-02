import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvLoader } from '../loader';
import { ResourceService } from './resource.service';
import { apiHelpers } from '../helpers';

export interface AnalysisPivotDataParams {
  form_id: number;
  created_after?: string;
  created_before?: string;
  status?: string[];
  tags?: number[];
  limit?: number;
}

export interface AnalysisPivotDataResponse {
  count: number;
  total: number;
  truncated: boolean;
  results: Record<string, string | number | null>[];
}

/**
 * Lean, flat per-post rows for the Analysis Report Builder's WebDataRocks
 * pivot table — see the sibling `PivotDataController.php` in `ushahidi-api`
 * for why this is a dedicated endpoint rather than the stock
 * `GET /posts?only=...,post_content`.
 */
@Injectable({
  providedIn: 'root',
})
export class AnalysisPivotDataService extends ResourceService<any> {
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
    return 'analysis-pivot-data';
  }

  list(params: AnalysisPivotDataParams): Observable<AnalysisPivotDataResponse> {
    // Array-valued params must use a literal `key[]` name for the backend to
    // parse them as an array rather than a scalar — same convention as
    // PostsService's postParamsMapper() (status[]/tags[]/form[]).
    const query: Record<string, any> = { form_id: params.form_id };
    if (params.created_after) {
      query['created_after'] = params.created_after;
    }
    if (params.created_before) {
      query['created_before'] = params.created_before;
    }
    if (params.status?.length) {
      query['status[]'] = params.status;
    }
    if (params.tags?.length) {
      query['tags[]'] = params.tags;
    }
    if (params.limit) {
      query['limit'] = params.limit;
    }
    return super.get(undefined, query);
  }
}
