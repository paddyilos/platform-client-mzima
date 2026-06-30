import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertsService } from '@mzima-client/sdk';

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

  constructor(
    private fb: FormBuilder,
    private alertsService: AlertsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      radius: [10, Validators.required],
      latitude: ['6.3', Validators.required],
      longitude: ['-10.8', Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.alertsService.subscribe(this.form.value).subscribe({
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
