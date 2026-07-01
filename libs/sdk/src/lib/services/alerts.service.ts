import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvLoader } from '../loader';
import { ResourceService } from './resource.service';
import { apiHelpers } from '../helpers';

export interface AlertPayload {
  radius: number;
  email: string;
  latitude: string;
  longitude: string;
  location?: string;
  categories?: number[];
}

export interface GeoLookupResult {
  county: string;
  district: string;
}

@Injectable({
  providedIn: 'root',
})
export class AlertsService extends ResourceService<any> {
  constructor(
    protected override httpClient: HttpClient,
    protected override currentLoader: EnvLoader,
  ) {
    super(httpClient, currentLoader);
  }

  getApiVersions(): string {
    return apiHelpers.API_V_3;
  }

  getResourceUrl(): string {
    return 'get-alerts';
  }

  subscribe(payload: AlertPayload): Observable<any> {
    return super.post(payload);
  }

  lookupLocation(lat: number, lng: number): Observable<GeoLookupResult> {
    return super.get('lookup-location', { lat, lng });
  }
}
