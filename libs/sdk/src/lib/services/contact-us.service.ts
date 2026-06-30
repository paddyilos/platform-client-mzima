import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvLoader } from '../loader';
import { ResourceService } from './resource.service';
import { apiHelpers } from '../helpers';

export interface ContactUsPayload {
  name: string;
  email: string;
  phone_number?: string;
  subject: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContactUsService extends ResourceService<any> {
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
    return 'contact-us';
  }

  submit(payload: ContactUsPayload): Observable<any> {
    return super.post(payload);
  }
}
