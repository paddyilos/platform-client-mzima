import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertsService, CategoriesService, CategoryInterface, apiHelpers } from '@mzima-client/sdk';

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
  selectedCategoryIds: number[] = [];

  constructor(
    private fb: FormBuilder,
    private alertsService: AlertsService,
    private categoriesService: CategoriesService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      radius: [10, Validators.required],
      latitude: ['6.3', Validators.required],
      longitude: ['-10.8', Validators.required],
    });

    this.categoriesService
      .getCategories({ only: apiHelpers.ONLY.TAG_ID_PARENTID_PARENT_SLUG })
      .subscribe({
        next: (data: any) => {
          this.categories = data.results ?? [];
        },
      });
  }

  toggleCategory(id: number, checked: boolean): void {
    if (checked) {
      this.selectedCategoryIds = [...this.selectedCategoryIds, id];
    } else {
      this.selectedCategoryIds = this.selectedCategoryIds.filter((c) => c !== id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    const payload = { ...this.form.value, categories: this.selectedCategoryIds };
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
