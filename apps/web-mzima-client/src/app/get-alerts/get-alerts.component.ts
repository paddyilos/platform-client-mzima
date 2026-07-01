import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertsService, CategoriesService, CategoryInterface, apiHelpers } from '@mzima-client/sdk';
import { FilterType } from '../shared/components/filter-control/filter-control.component';

@Component({
  selector: 'app-get-alerts',
  templateUrl: './get-alerts.component.html',
  styleUrls: ['./get-alerts.component.scss'],
})
export class GetAlertsComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  submitted = false;
  radiusOptions = [1, 5, 10, 20, 50, 100];
  categories: CategoryInterface[] = [];
  filterType = FilterType;
  location: any = { lat: 6.3, lng: -10.8 };
  resolvedLocationName = '';

  constructor(
    private fb: FormBuilder,
    private alertsService: AlertsService,
    private categoriesService: CategoriesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      radius: [10, Validators.required],
      latitude: [String(this.location.lat), Validators.required],
      longitude: [String(this.location.lng), Validators.required],
      categories: [[]],
    });

    this.categoriesService
      .getCategories({ only: apiHelpers.ONLY.TAG_ID_PARENTID_PARENT_SLUG })
      .subscribe({
        next: (data: any) => {
          this.categories = data.results ?? [];
        },
      });
  }

  onLocationChange({ location }: { location: { lat: number; lng: number } }): void {
    this.location = location;
    this.form.patchValue({ latitude: String(location.lat), longitude: String(location.lng) });
    this.alertsService.lookupLocation(location.lat, location.lng).subscribe({
      next: ({ county, district }) => {
        this.resolvedLocationName = [district, county].filter(Boolean).join(', ');
        this.cdr.detectChanges();
      },
      error: () => {
        this.resolvedLocationName = '';
        this.cdr.detectChanges();
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    const payload = { ...this.form.value, location: this.resolvedLocationName };
    this.alertsService.subscribe(payload).subscribe({
      next: () => {
        this.submitted = true;
        this.snackBar.open('You have subscribed to iReport Liberia alerts.', 'Close', {
          duration: 5000,
        });
      },
      error: (err) => {
        const msg = err?.error?.errors?.email?.[0] ?? 'Subscription failed. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
        this.submitting = false;
      },
    });
  }
}
